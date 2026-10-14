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

    private func tapStableButton(_ label: String) {
        let next = app.buttons[label]
        XCTAssertTrue(next.waitForExistence(timeout: 30), "Button must exist: \(label)")
        let deadline = Date().addingTimeInterval(30)
        var previousFrame: CGRect?
        repeat {
            let frame = next.frame
            if next.isHittable, !frame.isEmpty, previousFrame == frame {
                next.tap()
                return
            }
            previousFrame = frame
            Thread.sleep(forTimeInterval: 0.5)
        } while Date() < deadline
        XCTFail("Button must settle and be hittable before one tap: \(label)")
    }

    func testPublicBoulderJourney() throws {
        XCTAssertTrue(app.staticTexts["Willkommen!"].waitForExistence(timeout: 60), "First native launch must display onboarding")
        for title in ["Boulder durchstöbern", "Statistiken", "Beta entdecken", "Feedback & Support"] {
            tapStableButton("Weiter")
            XCTAssertTrue(app.staticTexts[title].waitForExistence(timeout: 30),
                          "One tap must advance onboarding to \(title)")
        }
        tapStableButton("Los geht's!")
        // A loaded guest page can remain covered if the final tap did not land.
        // Report that boundary directly instead of calling it a backend failure.
        let onboardingClosed = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "exists == false"),
            object: app.buttons["Los geht's!"])
        XCTAssertEqual(XCTWaiter.wait(for: [onboardingClosed], timeout: 30), .completed,
                       "Onboarding must close before checking the guest page")
        let guest = button("Als Gast fortfahren")
        if guest.exists { guest.tap() }
        let card = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@ AND label CONTAINS[c] %@", "Grad", "Farbe")).firstMatch
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
        Thread.sleep(forTimeInterval: 5)
        capture("store-03-boulder-detail")
        button("Zurück zur Boulderübersicht").tap()
        XCTAssertTrue(app.buttons["Boulder suchen"].waitForExistence(timeout: 15))
    }
}
