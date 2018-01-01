# jscad-gallery
A collection of OpenJSCAD 3D designs

https://danmarshall.github.io/jscad-gallery

This project uses [Jekyll](https://jekyllrb.com/) to create a web site that you can host on [GitHub pages](https://pages.github.com/).

## Setup

1. Fork this repo.
1. On your fork's GitHub page, go to Settings.
1. On the Settings page, scroll to the *GitHub Pages* section, and enable it on your master branch.
1. In about one minute, visit `https://your-github-username.github.io/jscad-gallery/` to see your personal jsad-gallery.

## Run the site locally

1. [Install Jekyll](https://jekyllrb.com/docs/installation/)
1. Clone your fork on your local machine.
1. cd to your `jscad-gallery` clone's folder
1. `npm install`
1. `jekyll serve`
1. See your local site on http://localhost:4000

## To add your design to the local site:

### If your design is a Node module

1. Install your package:

   `npm install your-package-name`

   or, if you aren't published to NPM:

   `npm install your-git-remote-url`

1. Generate your design files:

   `npm run build-design your-package-name`

### If your design is a .jscad file

* `npm run build-jscad path-to-your-jscad-file.jscad`

  Note - this will convert your .jscad file to a Node.js module. Look in your `node_modules/@jscad-gallery` folder.

  If you would like to edit your design's metadata, change the `node_modules/@jscad-gallery/your-package-name/package.json` file. You can then regenerate the new Node.js module directly by calling `npm run build-design @jscad-gallery/your-jscad-package-name` as above.

### Finalizing your design preview

After invoking either type of command above, a temporary local web page will appear. Follow the instructions to create a thumbnail image and post metadata. You may need to close all browser tabs to complete the process.

This will create 4 files that enable your jscad design on the site:
* `browser_modules/your-package-name/version-number.js` - The browserified executable module that creates your 3D design.
* `browser_modules/your-package-name/compact-binary.js` - The cached 3D solid data for a quick preview rendering of your design in the jscad viewer.
* `browser_modules/your-package-name/thumbnail.png` - A thumbnail image of your design.
* `_posts/yyyy-mm-dd-your-package-name.md` - The Jekyll database entry for your design.

Refresh your http://localhost:4000 to see your design on the site.

## To add your design to the GitHub pages site:

1. Stage your local changes:

    ```git add .```

1. Commit your local changes:

    ```git commit -m "added your-package-name"```

1. Push to your remote fork:

    ```git push```

In about a minute, your design will be live on your site at `https://your-github-username.github.io/jscad-gallery/`
