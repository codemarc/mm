# Show Command

A command for displaying account information, folder structures, and email statistics.

## Usage

```bash
mm show [account] [options]
```

## Description

The show command provides several views into account configurations and email stats:
- List all configured accounts with connection details
- Show folder structures for selected accounts
- Display unread and total message counts
- View full account configurations

## Account Selection

- By alias: `mm show work`
- By index: `mm show 1` 
- All accounts: `mm show all`
- Default: Uses MM_DEFAULT_ACCOUNT if no account specified

## Options

- `-l, --list`: List all configured accounts
  - Shows index numbers
  - Displays connection details
  - Basic account info

- `-c, --counts`: Show message statistics
  - Total message count
  - Unread message count
  - Per account metrics

- `-f, --folder`: Display folder structure
  - Shows folder hierarchy
  - Lists special folders
  - Indicates folder types

- `-v, --verbose`: Enable detailed logging
  - Shows IMAP operations
  - Logs connection details
  - Debug information

- `-q, --quiet`: Suppress non-essential output
  - Only account names
  - One per line format
  - Suitable for scripting

## Examples

```bash
# List all accounts
mm show -l

# Show message counts for default account
mm show -c

# Display folder structure for work account
mm show work -f

# Show counts across all accounts
mm show all -c

# List accounts in quiet mode
mm show -l -q
```

## Exit Status

- Returns 0 on success
- Returns error if account not found
- Returns error on connection failures

## Environment Variables

- `MM_DEFAULT_ACCOUNT`: Sets default account
  - Used when no account specified
  - Example: `export MM_DEFAULT_ACCOUNT="work"`

## See Also

- `clean` - Mailbox maintenance
- `delete` - Message deletion
- `scan` - Message scanning
