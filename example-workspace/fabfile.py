from fabric import task


@task
def develop(context):
    "Set up development environment"
    print("Run develop")

@task(help={
    "some_arg": "help for some-arg",
    "environment": "help for environment",
})
def fetch_data(context, some_arg, environment="dev"):
    print(f"Run develop with {some_arg!r} & {environment!r}")
    print("config-value", repr(context["someconfig"]["somekey"]))
