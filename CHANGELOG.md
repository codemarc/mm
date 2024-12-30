# Mailminder Changelog

# Mailminder Changelog

## [0.0.6] - 2024
### Added
- Enhanced unit test coverage for core functionality
- Improved mock implementations for IMAP operations
- Better handling of account configurations

### Changed
- Refactored clean command implementation
- Updated utility functions for better testability
- Streamlined account management logic

### Fixed
- Account validation and error handling improvements
- Mock function implementation in tests
- IMAP flow control and connection management

## [0.0.5] - 2024
### Added
- Support for multiple email account management
- New `open` command to launch email clients
- Enhanced account listing with index numbers
- Improved folder display and management
- Support for archive folder operations

### Changed
- Refactored account handling logic
- Better environment variable support
- Improved cross-platform compatibility
- Enhanced error messages and logging

## [0.0.4] - 2024
### Added
- Enhanced metrics display with comma-formatted numbers for better readability
- Added quiet mode (`-q, --quiet`) to show command for simplified output
- Improved error handling across all commands

## [0.0.3] - 2024
### Added
- New `read` command to read specific email messages
- Support for reading multiple messages using comma-separated sequence numbers
- Ability to mark messages as read when viewing them
- Support for filtering unread messages in read command
- Skip option for read command
- Improved message formatting and display

### Changed
- Enhanced error handling for message reading
- Better date formatting for message display

## [0.0.2] - 2024
### Added
- Improved blacklisted folder handling with multiple path attempts
- Added fallback paths for different email providers
- Enhanced error handling for folder creation and message moving

### Changed
- Better handling of blacklist folder creation
- Improved error messages for folder operations

## [0.0.1] - 2024
### Added
- Initial release
- Basic IMAP email account management
- Email scanning functionality
- Blacklist support
- Password encryption/decryption with `smash` command
- Configuration file support
- Multiple account management
- TLS support
- Basic metrics display