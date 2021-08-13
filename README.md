# Nody Greeter

[Web Greeter][web-greeter] is created with Python... which is slow. So, I wanted to re-create it with Node.js!

This is very experimental, do not use it.

## Considerations

This depends on some [Web Greeter][web-greeter] files, therefore this won't work without installing it.

Themes working in web-greeter should work also here.

- Some configurations inside `/etc/lightdm/web-greeter.yml` are not loaded
- There could be bugs!!
- It kinda works

## TODO

- [x] Load `web-greeter.yml`
- [x] Basic support
- [x] Detect theme erros alert
- [x] Brightness support
- [x] Battery support
- [ ] Screensaver support
- [x] Layouts support

## Pre-installation
```
npm install
./node_modules/.bin/electron-rebuild -w node-gtk
```

## Installation

Try:

```
npm run build
```

Then, install the **.deb** package

There is not any simple installation process for this.

- Try to compile it with `electron-builder` and install it
- Change the greeter in `/etc/lightdm/lightdm.conf` to `nody-greeter`

[web-greeter]: https://github.com/JezerM/web-greeter "Web Greeter"
