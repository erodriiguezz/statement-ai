# Release notes per issue

`/release` writes `<version>.md` here: one `## #<issue> <title>` section per issue, in the `breakdown` format (Summary, Changes, Testing, Foot Traffic Review, Notes / Risks). After the release PR merges to main, `.github/workflows/release.yml` posts each section as a comment on its issue.
