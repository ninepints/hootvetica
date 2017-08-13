# Hootvetica

An app I wrote in college to crowdsource how much food was left at The Hoot (a provider of late-night snacks). Completely unmaintained! Hopefully still works?


## Deployment


### Prerequisites

The application has a few dependencies beyond the packages listed in
requirements.txt:

*   [pip](http://www.pip-installer.org/) is a Python package management tool
    that will be used during the installation process. The use of
    [virtualenv,](http://www.virtualenv.org/) which creates isolated Python
    environments, is recommended but not required. (Environments created by
    virtualenv come with pip preinstalled!)

*   [Honcho](http://github.com/nickstenning/honcho/) or its Ruby-based parent,
    [Foreman,](http://ddollar.github.io/foreman/) will be used to set up the
    application's runtime environment.


### Installation

Start by cloning the Hootvetica repository.

    git clone https://github.com/ninepints/hootvetica.git && cd hootvetica

If you're using virtualenv, create a new environment for the project.
Environments are commonly located in the project's root directory. Once the
environment is created, run the `activate` script found in `<envdir>/bin`.

    virtualenv venv
    source venv/bin/activate

Finally, install the dependencies listed in `requirements.txt` using pip.

    pip install -r requirements.txt


### Configuration

Hootvetica expects a few environment variables to be set. Honcho or Foreman can
read these variables from a file named `.env` in the project's root directory
when launching the application. The full list of variables is:

*   `ALLOWED_HOSTS` - A comma-separated list of the hostnames the application
    will be reachable at. (Corresponds to [Django's `ALLOWED_HOSTS` setting](
    https://docs.djangoproject.com/en/1.5/ref/settings/#allowed-hosts).)

*   `AWS_BUCKET_NAME` - If you want to serve static files using Amazon S3, put
    your S3 bucket name here.

*   `AWS_ID` - Your Amazon Web Services Access Key ID, used to access S3.

*   `AWS_SECRET` - The secret corresponding to your Access Key ID, used to
    access S3.

*   `DATABASE_URL` - A URL pointing to the database Django will use.

*   `DJANGO_SECRET` - A secret string used by Django for cryptographic signing,
    among other things. (Corresponds to [Django's `SECRET_KEY` setting](
    https://docs.djangoproject.com/en/1.5/ref/settings/#secret-key).)

*   `GOOGLE_ANALYTICS_DOMAIN` - If you want to send activity to Google
    Analytics, put the domain for your Analytics property here.

*   `GOOGLE_ANALYTICS_ID` - Your Google Analytics property Tracking ID.

A sample `.env` file would look something like the following.

    ALLOWED_HOSTS=localhost
    DATABASE_URL=postgres://localhost/mydatabase
    DJANGO_SECRET=mytopsecretstring

If you don't want to use Google Analytics, just leave the relevant environment
variables unset.

If you don't want to serve static files using Amazon S3, you'll need to make
some changes to `hootvetica/settings.py`:

*   Comment out the settings `DEFAULT_FILE_STORAGE`, `STATICFILES_STORAGE`,
    `COMPRESS_STORAGE`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and
    `AWS_STORAGE_BUCKET_NAME`.

*   Change the setting `STATIC_URL` to the URL static files will be served from.

You'll also have to take care of serving the static files yourself.
(Alternatively, Django's development server will serve them for you if the
`DEBUG` setting is `True`. To use the development server, substitute
`honcho run python manage.py runserver` for `honcho start` when starting the
application in the next section. Note that the development server is not
production-ready.)


### First Launch

Before Hootvetica is run, its database must be set up and static files
collected. Run the following command to create the necessary database tables.

    honcho run python manage.py syncdb

Next, collect the application's static files (which will also push them to S3
if it's been set up).

    honcho run python manage.py collectstatic

Once that's done, compress the static files. (This minimizes both the size of
static assets served and the number of files served per page.)

    honcho run python manage.py compress

Finally, start the application.

    honcho start


### Troubleshooting

__None of the CSS or JavaScript loads__

Use your browser's developer tools to make sure it's looking for static assets
in the right place. If you're using S3, open the S3 management console and
verify that everything's been uploaded with the proper permissions.

__Installation of gevent/greenlet fails with an error message mentioning
`event.h`__

You may need to install [libevent.](http://libevent.org)
