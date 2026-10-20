# Video originals / SDR native integration, 20 October 2026

The existing Android82 / TestFlight99 integration is retained and updated with the current published main changes and PR68, including the browser SDR brightness hint from PR64. The normal mobile detail player uses the latest approved V5 composition. Existing green Beta icons, earlier guest onboarding and corrected native swipe direction remain present; newer unmerged PR58/PR62 work is separate.

The merge preserves the lazy feed entry and the combined guest onboarding regression while adding the current feed zoom/preferences/transition tests and the new detail-player CI suite. Android versionCode83 is prepared. Both native packages still require build/signature/artifact checks and availability verification before claiming delivery.

Server candidate source is aba3aa97c15364584557a780e3bc8518c8bb76ec with unchanged server manifest. Archive rollout, a canary, bulk migration and final inventory must be verified before publishing clients. Current physical iPhone/HDR acceptance remains unverified.
