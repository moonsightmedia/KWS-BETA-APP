# Echte Entwicklungsansichten – V18

Isolierter lokaler Serve-only-Trainingsharness, keine Produktivrouten aktiviert.
Quelle: test/fixtures/training-preview.tsx und vite.training-preview.config.ts.
Synthetisches Trainingsprofil ohne echte Kontodaten; alle externen Requests
während der Aufnahme blockiert. Onboarding übersprungen und Chat-Hinweis
geschlossen. Screens vom Trainingsstart und /training/library/kids.
Browserviewport 390×800, DPR2, Export 780×1600. Technischer WebP-Export mit
Sharp, Qualität86, ohne Retusche oder Bildgenerierung. Statusleiste ergänzt
wie bei den vorhandenen Marketinggeräten; Screens proportional eingepasst.
Reproduzierbar: output/landing-v18/capture.cjs.

public/landing/roadmap-app-training.webp: 76580 Bytes; SHA-256 a03c6c9b7039c46eb6d526bb6ee6b34eee143adc37ef8e1f359b33dd5264e468

public/landing/roadmap-app-kids.webp: 54670 Bytes; SHA-256 269ffc9ed5e6a8583a4f13bc72fb548240ecf2c155706cb1f5ad0247e6f6ae4a

Kletterhalle besitzt noch keine echte UI: ausdrücklich beschriftete Planung
im selben Rahmen, keine erfundenen Routen, Zahlen oder Bedienelemente.
V17-Konzeptillustrationen bleiben historische Assets und werden nicht verwendet.
