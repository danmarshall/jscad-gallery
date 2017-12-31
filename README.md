# jscad-gallery
A collection of OpenJSCAD 3D designs

https://danmarshall.github.io/jscad-gallery

## To add your design to this site:

### One-time-only: Set up a fork and clone ###
1. Fork this repo.
1. Clone your fork on your local machine.
1. `npm install`

### Each time you want to add a design
1. On your local machine:

    ```npm install your-package-name```

    or, if you aren't published to NPM:

    ```npm install your-git-remote-url```

1. Generate your design files:

    If your design is a Node.js module:

    ```npm run build-design your-package-name```

    or, if your design is a .jscad file:

    ```npm run build-jscad path-to-your-jscad-file.jscad```

    [Note - this will convert your .jscad file to a Node.js module, look in your `node_modules\@jscad-gallery` folder]

1. A local web page will appear. Follow the instructions to create a thumbnail image and post metadata.
1. Stage your local changes:

    ```git add .```

1. Commit your local changes:

    ```git commit -m "added your-package-name"```

1. Push to your remote fork:

    ```git push```

1. Submit a pull request from your fork's GitHub page.
