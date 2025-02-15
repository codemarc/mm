# Mailminder Changelog

## [0.0.7] - 2025
### Added
- Filter management command with create/delete operations
- Enhanced documentation for all commands
- Cross-reference links in command docs

### Changed
- Improved command argument handling
- Better default value management
- Standardized quiet/verbose modes


## [0.0.6] - 2024
### Added
- New features and enhancements
- Enhanced unit test coverage for core functionality
- Improved mock implementations for IMAP operations
- Better handling of account configurations

### Changed
- Improved documentation and comments
- Refactored clean command implementation
- Updated utility functions for better testability
- Streamlined account management logic

### Fixed
- Account validation and error handling improvements
- Mock function implementation in tests
- IMAP flow control and connection management
- Improved documentation and comments

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

## [0.0.2] - 2024-01-15
### Added
- `open` command for launching email clients
- `filter` command for managing email filters
- Support for multiple email accounts
- Enhanced folder operations
- Comprehensive documentation

### Changed
- Improved error handling
- Better cross-platform support
- Enhanced configuration management
- Standardized command options

### Fixed
- Account validation issues
- Configuration file handling
- Command option parsing

## [0.0.1] - 2024-01-01
### Added
- Initial release
- Basic IMAP operations
- Core commands: show, scan, delete, clean
- Encryption support with smash command
- Configuration file support
- TLS/SSL support
- Multiple account management