# Command Reference

A comprehensive guide to Mail Manager (mm) commands and their usage.

## Global Options

These options are available across all commands:

- `-v, --verbose`: Enable detailed logging output
- `-q, --quiet`: Suppress non-essential output
- `-h, --help`: Display command help

## Core Commands

### show - Information Display
```bash
mm show [account] [options]
  -c, --counts   Show message counts
  -f, --folder   Display folder structure
  -l, --list     List accounts
  -q, --quiet    Minimal output
```
[Details](show.md)

### scan - Message Analysis
```bash
mm scan [account] [limit] [options]
  -a, --archive  Set archive folder
  -b, --brief    Minimal output
  -f, --folder   Target folder
  -l, --limit    Message limit
  -r, --read     Mark as read
  -s, --skip     Skip messages
  -u, --unread   Only unread
  -z, --zero     Reset counts
```
[Learn more about scan](scan.md)

### delete - Message Removal
```bash
mm delete [account] [options]
  -f, --folder   Source folder
  -i, --index    Position-based selection
  -s, --seqno    Sequence-based selection
```
[Delete command guide](delete.md)

### clean - Maintenance
```bash
mm clean [account] [options]
  -q, --quiet    Silent operation
  -v, --verbose  Show details
```
[Maintenance guide](clean.md)

### open - Client Launch
```bash
mm open [what] [options]
  -v, --verbose  Debug info
```
[Open command details](open.md)

### smash - Security
```bash
mm smash [options]
  -e, --encrypt  Encrypt secrets
  -d, --decrypt  Decrypt secrets
```
[Security guide](smash.md)

## Command Combinations

Common command combinations and workflows:

### Maintenance Flow
```bash
# Check accounts
mm show -l

# View message counts
mm show -c

# Clean mailboxes
mm clean all
```

### Message Management
```bash
# View messages
mm scan -l 10

# Delete specific messages
mm delete -i 1,2,3

# Mark remaining as read
mm scan -r
```

### Account Setup
```bash
# Encrypt credentials
mm smash -e

# Verify configuration
mm show all

# Test connection
mm scan -l 1
```

## Environment Variables

Global settings that affect all commands:

```bash
# Required
MM_CRYPTOKEY="encryption-key"

# Optional
MM_DEFAULT_ACCOUNT="work"
MM_FILTERS_PATH="./filters"
MM_SCAN_LIMIT="5"
```

## Exit Codes

- 0: Success
- 1: General error
- 2: Configuration error
- 3: Network error

## See Also

- [Installation Guide](../README.md#installation)
- [Configuration Guide](configuration.md)
- [Filter Rules](filters.md)

# MM Command Reference

Core commands for managing email accounts and messages.

## Message Commands

- [scan](./scan.md) - Inspect and manage messages
- [show](./show.md) - Display message details
- [delete](./delete.md) - Move messages to trash
- [clean](./clean.md) - Perform mailbox cleanup

## Account Commands

- [list](./list.md) - Show configured accounts
- [open](./open.md) - Launch email clients

## Options

All commands support these common options:
- `-v, --verbose` - Show detailed logging
- `-q, --quiet` - Suppress non-error output

## Environment Variables

- `MM_DEFAULT_ACCOUNT` - Default account for commands
- `MM_CONFIG_DIR` - Configuration directory location
- `MM_DEBUG` - Enable debug logging when set
