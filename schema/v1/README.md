# Providencia Onchain schema v1

This directory contains the integration-neutral schema and export contract for
the Providencia Onchain technical integration. It is intended to be reusable by
another location without exposing merchant-level or participant-identifying
data.

The public transparency view exposes aggregates and authorised programme
payments. Merchant-level records and the mapping between registered merchants
and addresses remain access-controlled.

The schema is licensed under the Apache License 2.0 in the repository root.
Application code, deployment configuration, credentials, private operational
logic, and local working files remain subject to their own repository and
dependency terms unless expressly included in the licensed schema or code.
