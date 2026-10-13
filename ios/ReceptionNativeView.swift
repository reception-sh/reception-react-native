import ExpoModulesCore
import SwiftUI
import Reception

internal final class ReceptionNativeView: ExpoView {
    private var host: UIHostingController<ReceptionChatView>?

    override func didMoveToWindow() {
        super.didMoveToWindow()
        if window != nil, host == nil {
            guard let parent = nearestViewController() else { return }
            let controller = UIHostingController(rootView: ReceptionChatView())
            controller.view.backgroundColor = .clear
            parent.addChild(controller)
            addSubview(controller.view)
            controller.view.frame = bounds
            controller.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            controller.didMove(toParent: parent)
            host = controller
        } else if window == nil, let controller = host {
            controller.willMove(toParent: nil)
            controller.view.removeFromSuperview()
            controller.removeFromParent()
            host = nil
        }
    }

    private func nearestViewController() -> UIViewController? {
        var responder: UIResponder? = self
        while let current = responder {
            if let controller = current as? UIViewController { return controller }
            responder = current.next
        }
        return nil
    }
}
