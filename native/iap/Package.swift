// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "LifenumIap",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "LifenumIap",
            targets: ["LifenumIapPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "LifenumIapPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/LifenumIapPlugin")
    ]
)
