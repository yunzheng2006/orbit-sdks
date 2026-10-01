# Orbit API — Go

Generated from the Orbit API definition (463 operations). Standard library only.

```sh
go get github.com/yunzheng2006/orbit-sdks/rest/go
```

```go
c := orbit.New("") // token from $ORBIT_TOKEN
zones, err := c.DnsZonesList(ctx, nil)
rec, err := c.DnsRecordsCreate(ctx, zoneID, map[string]any{"type": "A", "name": "www", "content": "192.0.2.10"}, nil)
err = c.Paginate(ctx, "zones.list", orbit.Args{}, func(z json.RawMessage) error { fmt.Println(string(z)); return nil })
```

Every method returns the JSON answer as `json.RawMessage`; errors are `*orbit.Error` with `Status` and `Code`. `Operations` lists every endpoint with its scope.
