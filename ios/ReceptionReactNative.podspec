require 'json'
package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))
sdk_version = File.read(File.join(__dir__, '..', 'vendor/reception-ios/Sources/Reception/Version.swift'))[/static let current = "([^"]+)"/, 1]
Pod::Spec.new do |s|
  s.name = 'ReceptionReactNative'
  s.version = package['version']
  s.summary = package['description']
  s.homepage = package['homepage']
  s.license = { :type => 'MIT', :file => '../LICENSE' }
  s.author = 'Reception'
  s.source = { :git => 'https://github.com/reception-sh/reception-react-native.git', :tag => s.version.to_s }
  s.ios.deployment_target = '17.0'
  s.swift_version = '5.0'
  s.static_framework = true
  s.source_files = '**/*.swift'
  s.dependency 'ExpoModulesCore'
  s.dependency 'Reception', sdk_version
  s.pod_target_xcconfig = { 'SWIFT_STRICT_CONCURRENCY' => 'complete', 'DEFINES_MODULE' => 'YES' }
end
