# Delete Command

A powerful command for email management that handles message deletion, folder cleanup, and batch operations across multiple accounts.

## Usage

```bash
mm delete [account] [options] [seq]
```

## Account Selection

- By alias: `mm delete work
- By index: `mm delete 1` (index shown in account list)
- All accounts: `mm delete all` 
- Default: Uses MM_DEFAULT_ACCOUNT if no account specified

## Command Options

- `--account <alias|index|all>`: Target account selection
  - Overrides positional account argument
  - Examples: `delete work`, `delete 2`, `delete all`

- `--empty`: Performs full cleanup
  - Empties Trash, Spam, and Drafts folders
  - Marks all Archive messages as read
  - Safe to run regularly for maintenance

- `--folder [name]`: Move folder contents to trash
  - With name: `--folder "Newsletter"` moves specified folder
  - Without name: `--folder` targets Blacklisted folder
  - Preserves messages in trash for review

- `--limit <n>`: Control batch size
  - Works with sequence numbers
  - Example: `delete +10 --limit 5` moves only 5 of last 10 messages

- `--test`: Simulation mode
  - Shows what would happen without making changes
  - Useful for verifying sequence selections

- `--verbose`: Detailed logging
  - Shows folder paths and message counts
  - Logs each operation as it occurs

## Environment Variables

- `MM_DEFAULT_ACCOUNT`: Sets default account when none specified
  - Example: `export MM_DEFAULT_ACCOUNT="work"`
  - Can be overridden by --account option

## Message Selection

### Sequence Number Formats
- `+n`: Last n messages (newest)
  ```bash
  mm delete +5        # Move 5 newest messages to trash
  mm delete +10 --test # Preview deletion of 10 newest
  ```

- `-n`: First n messages (oldest)
  ```bash
  mm delete -3        # Move 3 oldest messages to trash
  ```

- `n-m`: Message range
  ```bash
  mm delete 5-10      # Move messages 5 through 10 to trash
  ```

- `n,m,o`: Specific messages
  ```bash
  mm delete 1,3,5     # Move messages 1, 3, and 5 to trash
  ```

## Common Workflows

### Account Maintenance
```bash
# Clean all accounts
mm delete --empty --account all

# Clean specific account
mm delete work --empty
```

### Folder Management
```bash
# Empty newsletters folder
mm delete --folder "Newsletters"

# Empty blacklist folder
mm delete --folder

# Preview folder cleanup
mm delete --folder "Temp" --test
```

### Batch Operations
```bash
# Move last 20 messages, 5 at a time
mm delete +20 --limit 5

# Clean spam across accounts
mm delete all --empty
```

## Error Handling

- Invalid account: Displays "account not found" error
- Empty selection: Shows "no messages to delete" warning
- Connection issues: Logs error and exits gracefully
- Folder access: Reports if folder cannot be accessed

## Special Folders

The command handles special folders differently:
- `Archive`: Uses Gmail's "All Mail" folder if standard archive not found
- `Trash`: Messages moved here are deleted on empty command
- `Spam`: Automatically emptied with --empty flag
- `Drafts`: Included in empty operation
