import Capacitor

/// Registers app-local Capacitor plugins that are not supplied by an npm package.
@objc(KWSBridgeViewController)
final class KWSBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(UploadMasterEncoderPlugin())
    }
}
