# Clean Command

A maintenance command that performs mailbox cleanup operations across folders.

## Usage

```bash
mm clean [account] [options]
```

## Description

The clean command performs the following operations:
- Marks all messages in Archive folder as read
- Permanently deletes all messages in Trash folder
- Permanently deletes all messages in Spam folder 
- Permanently deletes all messages in Drafts folder

## Account Selection

- By alias: `mm clean work`
- By index: `mm clean 1`
- All accounts: `mm clean all` 
- Default: Uses MM_DEFAULT_ACCOUNT if no account specified

## Options

- `--verbose`: Enables detailed logging
  - Shows folder paths
  - Logs expunge operations
  - Shows connection details

## Environment Variables

- `MM_DEFAULT_ACCOUNT`: Sets default account when none specified
  - Example: `export MM_DEFAULT_ACCOUNT="work"`

## Examples

```bash
# Clean default account
mm clean

# Clean specific account
mm clean work

# Clean all accounts with verbose logging
mm clean all --verbose

# Clean account by index
mm clean 1
```

## Exit Status

- Returns 0 on success
- Returns error message if account not found
- Returns error message on connection failures

## See Also

- `delete` - More selective deletion options
- `list` - List configured accounts
