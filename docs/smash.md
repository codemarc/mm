# Smash Command

Encrypt/decrypt secrets.

## Usage

```bash
mm smash [options]
```

## Options

- `-e, --encrypt`: Encrypt secrets
- `-d, --decrypt`: Decrypt secrets

## Examples

```bash
# Encrypt configuration secrets
mm smash --encrypt

# Decrypt configuration secrets
mm smash --decrypt
```

## Notes

- Used for securing sensitive configuration data
- Only one operation (encrypt/decrypt) can be performed at a time
- Requires MM_CRYPTOKEY environment variable to be set

## See Also

- [commands](./commands.md) - Command reference
