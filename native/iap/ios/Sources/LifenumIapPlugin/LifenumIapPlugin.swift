import Foundation
import UIKit
import Capacitor
import StoreKit

/// StoreKit 2 bridge used by the iOS app to sell the LifeNum membership.
/// The backend verifies every transaction with the App Store Server API before
/// granting membership, so the JS layer never trusts client-side data.
@objc(LifenumIapPlugin)
public class LifenumIapPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LifenumIapPlugin"
    public let jsName = "LifenumIap"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "currentEntitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manageSubscriptions", returnType: CAPPluginReturnPromise)
    ]

    private func verified(_ result: VerificationResult<Transaction>) throws -> Transaction {
        switch result {
        case .verified(let transaction):
            return transaction
        case .unverified(_, let error):
            throw error
        }
    }

    private func entitlements() async -> [[String: Any]] {
        var transactions: [[String: Any]] = []
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            transactions.append([
                "transactionId": String(transaction.id),
                "productId": transaction.productID,
                "jws": result.jwsRepresentation
            ])
        }
        return transactions
    }

    @objc func getProducts(_ call: CAPPluginCall) {
        let productIds = call.getArray("productIds", String.self) ?? []
        guard !productIds.isEmpty else {
            call.resolve(["products": [[String: Any]]()])
            return
        }
        Task {
            do {
                let products = try await Product.products(for: productIds)
                let payload = products.map { product -> [String: Any] in
                    [
                        "id": product.id,
                        "displayName": product.displayName,
                        "displayPrice": product.displayPrice
                    ]
                }
                call.resolve(["products": payload])
            } catch {
                call.reject("PRODUCTS_FAILED", nil, error)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("INVALID_INPUT")
            return
        }
        let accountToken = call.getString("appAccountToken")
        Task {
            do {
                guard let product = try await Product.products(for: [productId]).first else {
                    call.reject("PRODUCT_NOT_FOUND")
                    return
                }
                var options: Set<Product.PurchaseOption> = []
                if let token = accountToken, let uuid = UUID(uuidString: token) {
                    options.insert(.appAccountToken(uuid))
                }
                let result = try await product.purchase(options: options)
                switch result {
                case .success(let verification):
                    let transaction = try self.verified(verification)
                    await transaction.finish()
                    call.resolve([
                        "status": "success",
                        "transactionId": String(transaction.id),
                        "productId": transaction.productID,
                        "jws": verification.jwsRepresentation
                    ])
                case .pending:
                    call.resolve(["status": "pending"])
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                @unknown default:
                    call.reject("UNKNOWN_RESULT")
                }
            } catch {
                call.reject("PURCHASE_FAILED", nil, error)
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                call.resolve(["transactions": await self.entitlements()])
            } catch {
                call.reject("RESTORE_FAILED", nil, error)
            }
        }
    }

    @objc func currentEntitlements(_ call: CAPPluginCall) {
        Task {
            call.resolve(["transactions": await self.entitlements()])
        }
    }

    @objc func manageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene else {
                call.reject("NO_WINDOW_SCENE")
                return
            }
            do {
                try await AppStore.showManageSubscriptions(in: scene)
                call.resolve()
            } catch {
                call.reject("MANAGE_FAILED", nil, error)
            }
        }
    }
}
