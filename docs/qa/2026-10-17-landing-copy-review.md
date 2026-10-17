# Landing copy review · 17 October 2026

Reviewed the full marketing page: hero, store controls, feature descriptions and captions, roadmap, partner contributions, footer, metadata, alt text and dynamic accessibility announcements. The criterion is clear, specific, supported wording; this is an editorial review, not a claim to identify the author of a sentence.

## Product checks

- Guest.tsx implements current-boulder photos, difficulty, color and sector filters. Copy describes these actions instead of an unspecified next project.
- BoulderDetailSections.tsx and Statistics.tsx implement personal attempts, Tops, Flashes, dated sessions and project markings. Copy now identifies the account requirement and the actual statistics, rather than suggesting automatic improvement.
- Video copy is conditional on a video being present and describes one possible solution. Official hall videos are distinguished from the app's other content.
- ResetSchedule.tsx has appointment and calendar views with dates and hall areas. Both views are named in the copy.
- features/training/flags.ts excludes training previews from production. Training types, planBuilder and kidsContent support exercise selection, custom sessions and supervised group activities with age/group/time/instruction information. These remain unreleased previews. The climbing screen remains explicitly a generated concept, without a promised release date.
- The project brief confirms joint development by Moonsight Media and Kletterwelt Sauerland. Partner copy now states the app work and the hall's data, official videos and reset dates, replacing vague descriptions of passion or experience.

## Editorial changes

The hero now says “Boulder finden. Betas ansehen.” and explains current boulders, video solutions and recorded attempts/Tops. Feature headings name concrete tasks; descriptions avoid universal video coverage and unmeasured progress claims. The roadmap describes the planned scope without implying current availability. Partner fields name actual screens, functions and hall content. Store labels say “Link folgt”; there is no supported launch date for a “Bald” promise. The footer calls that section “Store-Links” instead of offering a download that the placeholder buttons cannot provide.

Shorter, descriptive alt text replaces authenticity claims such as “echte Ansicht”. Demo statistics stay explicitly marked as example data. Legal-page headers and footers are regenerated from the landing template; legal-body text is retained. Community-rule metadata correctly refers to app use rather than participation on the static landing.

## Verification

Landing build and asset integrity verification pass; JavaScript syntax passes. Two local rendered review loops cover 375, 768, 1280 and 1920 px, normal and reduced motion, all four feature states, all three roadmap previews and both partner states. No page overflow or runtime/asset errors; pinned feature copy fits the viewport. Manual inspection caught an overlong mobile partner label, shortened to “Schraubplan”. Hero wording was measured with the actual mobile font and checked in screenshots. Capture the hero after its existing entrance animation has completed.

Local artifacts: output/landing-copy/qa-results.json and neighboring screenshots. The existing shared app/landing CI and deployment checks validate the final committed source; no new tests tied to individual prose strings were added.
