import UIKit

@main
struct ColorTests {
  @MainActor static func main() {
    let pair = ["light": "#112233", "dark": "#aabbcc80"]
    guard let color = ReceptionColor.decode(pair) else {
      preconditionFailure("Valid pair rejected")
    }
    let light = color.resolvedColor(with: UITraitCollection(userInterfaceStyle: .light))
    let dark = color.resolvedColor(with: UITraitCollection(userInterfaceStyle: .dark))
    var red: CGFloat = 0
    var green: CGFloat = 0
    var blue: CGFloat = 0
    var alpha: CGFloat = 0
    precondition(light.getRed(&red, green: &green, blue: &blue, alpha: &alpha))
    precondition(abs(red - 17.0 / 255) < 0.001 && abs(alpha - 1) < 0.001)
    precondition(dark.getRed(&red, green: &green, blue: &blue, alpha: &alpha))
    precondition(abs(red - 170.0 / 255) < 0.001 && abs(alpha - 128.0 / 255) < 0.001)
    precondition(ReceptionColor.decode(["light": "#112233"]) == nil)
    precondition(ReceptionColor.decode(["light": "#112233", "dark": "wrong"]) == nil)
    precondition(ReceptionColor.decode("#12345678") != nil)
    print("ReceptionColor: dynamic light/dark traits, alpha and malformed input passed")
  }
}
