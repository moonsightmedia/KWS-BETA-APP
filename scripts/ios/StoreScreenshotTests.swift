import XCTest

final class StoreScreenshotTests: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "com.kletterwelt.beta")

    override func setUpWithError() throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .portrait
        app.launchArguments += ["-AppleLanguages", "(de)", "-AppleLocale", "de_DE"]
        app.launch()
    }

    override func tearDownWithError() throws {
        if testRun?.hasSucceeded == false {
            let tree = XCTAttachment(string: app.debugDescription)
            tree.name = "diagnostic-public-guest-ui"
            tree.lifetime = .keepAlways
            add(tree)
            capture("diagnostic-failure")
        }
        app.terminate()
    }

    private func button(_ label: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", label)).firstMatch
    }

    private func capture(_ name: String) {
        let attachment = XCTAttachment(data: XCUIScreen.main.screenshot().pngRepresentation,
                                       uniformTypeIdentifier: "public.png")
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func testPublicBoulderJourney() throws {
        let guest = button("Als Gast fortfahren")
        XCTAssertTrue(guest.waitForExistence(timeout: 60), "Native app must display guest access")
        guest.tap()
        let card = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "Komet")).firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 60), "Live Hostinger boulders must load")
        XCTAssertFalse(app.staticTexts["Boulder konnten nicht geladen werden"].exists)
        Thread.sleep(forTimeInterval: 5)
        capture("store-01-boulder-list")

        let filters = app.buttons["Filter"]
        XCTAssertTrue(filters.waitForExistence(timeout: 10))
        filters.tap()
        XCTAssertTrue(app.staticTexts["Boulder filtern"].waitForExistence(timeout: 10))
        capture("store-02-boulder-filters")
        button("Filter schließen").tap()
        XCTAssertTrue(card.waitForExistence(timeout: 10))
        if !card.isHittable { app.swipeUp() }
        XCTAssertTrue(card.isHittable)
        card.tap()
        XCTAssertTrue(button("Zurück zur Boulderübersicht").waitForExistence(timeout: 30))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "Komet")).firstMatch.exists)
        Thread.sleep(forTimeInterval: 5)
        capture("store-03-boulder-detail")
        button("Zurück zur Boulderübersicht").tap()
        XCTAssertTrue(app.buttons["Boulder suchen"].waitForExistence(timeout: 15))
    }
}
