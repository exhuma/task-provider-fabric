from fabric import task

@task
def convert_gif(ctx):
    """
    Converts resources/demo.mkv ti resources/demo.gif
    """
    ctx.run(
        'ffmpeg '
        '-i resources/demo.mkv -filter_complex "[0:v] palettegen" '
        'resources/palette.png',
        pty=True
    )
    ctx.run(
        'ffmpeg -i resources/demo.mkv '
        '-i resources/palette.png '
        '-filter_complex "[0:v][1:v] paletteuse" '
        'resources/demo.gif',
        pty=True
    )


@task
def build(ctx):
    """
    Build the distribution package of the extension
    """
    ctx.run("vsce package", replace_env=False)
