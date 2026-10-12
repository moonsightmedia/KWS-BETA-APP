require 'xcodeproj'

# CI-only target: never changes the shipping app or its signing configuration.
project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |target| target.name == 'App' }
abort 'App target missing' unless app
abort 'Screenshot target already exists' if project.targets.any? { |t| t.name == 'KWSScreenshotTests' }
tests = project.new_target(:ui_test_bundle, 'KWSScreenshotTests', :ios, '15.0')
tests.add_dependency(app)
source = project.main_group.new_file(File.expand_path('scripts/ios/StoreScreenshotTests.swift'))
tests.source_build_phase.add_file_reference(source)
tests.build_configurations.each do |configuration|
  configuration.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'com.kletterwelt.beta.screenshot-tests',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'SWIFT_VERSION' => '5.0',
    'TEST_TARGET_NAME' => 'App',
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'CODE_SIGNING_ALLOWED' => 'NO',
    'CODE_SIGNING_REQUIRED' => 'NO'
  })
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.add_build_target(tests)
scheme.add_test_target(tests)
scheme.set_launch_target(app)
scheme.test_action.build_configuration = 'Release'
scheme.save_as(project_path, 'KWSScreenshots', true)
puts 'Created CI-only native UI test target'
