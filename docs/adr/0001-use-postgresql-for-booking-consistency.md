;# Use PostgreSQL for booking consistency

The application uses PostgreSQL as its primary database because booking availability depends on consistent checks over overlapping time slots. PostgreSQL gives the first version a practical foundation for transactions, indexes, and future database-level constraints while still fitting the project's Docker and CI goals.
