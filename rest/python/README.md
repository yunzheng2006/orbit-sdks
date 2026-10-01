# Orbit API — Python

Generated from the Orbit API definition (463 operations). Standard library only, Python 3.8+.

```sh
pip install orbit-api
```

```python
from orbit_api import Client
api = Client()  # token from $ORBIT_TOKEN
zone = api.dns.zones.list()["data"][0]
api.dns.records.create(id=zone["id"], body={"name": "www", "type": "A", "content": "192.0.2.10"})
for site in api.shield.sites.list.all():
    print(site["hostname"])
```

Path and query parameters are keyword arguments, the JSON body is `body`. Errors raise `OrbitError` (`status`, `code`). `api.call("records.create", id=..., body=...)` reaches any operation by its operationId.
