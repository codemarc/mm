# Delete Command

A powerful command for email management that handles selective message deletion by index or sequence numbers.

## Usage

```bash
mm delete [account] [options]
```

## Description

The delete command moves selected messages to the Trash folder using two selection methods:
- Index-based selection: Select messages by their reverse chronological position 
- Sequence-based selection: Select messages by their IMAP sequence numbers

## Account Selection 

- By alias: `mm delete work`
- By index: `mm delete 1`
- Default: Uses MM_DEFAULT_ACCOUNT if no account specified
- Note: 'all' accounts mode is not supported for delete operations

## Options

- `-i, --index`: Select messages by position index
  - Single: `--index 1` (newest message)
  - Multiple: `--index 1,2,3`
  - Range with dash: `--index 1-3`
  - Range with colon: `--index 1:3`
  - Can combine: `--index 1:3,5,7-9`

- `-s, --seqno`: Select messages by IMAP sequence number
  - Single: `--seqno 2201`
  - Multiple: `--seqno 28,29`
  - Range: `--seqno 4:6`
  - All: `--seqno 1:*`

- `-f, --folder`: Select source folder (default: INBOX)
  - Example: `--folder "Newsletter"`

- `-v, --verbose`: Enable detailed logging
  - Shows message UIDs
  - Logs move operations
  - Shows folder paths

- `-q, --quiet`: Suppress non-error output
  - Only shows critical errors
  - Useful for scripts

## Examples

```bash
# Delete newest message in default account
mm delete --index 1

# Delete messages 1-3 from work account
mm delete work --index 1-3

# Delete by sequence numbers
mm delete --seqno 2201,2202

# Delete from specific folder
mm delete --folder "Newsletter" --index 1:5

# Delete with verbose logging
mm delete --index 1 --verbose
```

## Notes

- Messages are moved to Trash folder, not permanently deleted
- Can only operate on one account at a time
- Index numbers are 1-based and count from newest to oldest
- Invalid selections are reported as errors
- Use verbose mode to preview operations

## See Also

- `clean` - Full mailbox cleanup operations
- `show` - View message details before deleting
- `list` - Show account indexes
