# Share API types, not business rules

The Nx workspace may use a minimal shared library for API request and response types, but booking business rules stay on the backend. This keeps the backend as the source of truth for availability, authorization, and status transitions while still giving the Angular app compile-time clarity about API contracts.
