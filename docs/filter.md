# Filter Command

Manage email filters.

## Usage

```bash
mm filter [account] [options]
```

## Arguments

- `account`: Specify account from config (defaults to all)

## Options

- `-b, --brief`: Brief/minimal output
- `-c, --create`: Create a filter folder
- `-d, --delete`: Delete a filter folder
- `-q, --quiet`: Quiet mode
- `-v, --verbose`: Verbose mode

## Examples

```bash
# List filters for all accounts
mm filter

# Create filter folder
mm filter work --create

# Delete filter folder
mm filter personal --delete

# Show brief filter list
mm filter --brief

# List filters with details
mm filter --verbose
```

## Notes

- Filter folders help organize incoming mail
- Use create/delete to manage filter structure
- Brief mode shows condensed filter information
- Verbose mode shows filter details and rules

## See Also

- [show](./show.md) - Show configuration
- [commands](./commands.md) - Command reference
