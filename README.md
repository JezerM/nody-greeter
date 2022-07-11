<div align="center">
  <a>
    <img
      alt="Nody Greeter Icon"
      width="125"
      src="./dist/com.github.jezerm.nody-greeter.svg"
    />
  </a>
  <h1><strong>Nody Greeter</strong></h1>
  <p>
    <strong>A LightDM greeter made with Electron.js and NodeGTK</strong>
  </p>
  <p>
    <a href="#">
      <img alt="License Information" src="https://img.shields.io/github/license/JezerM/nody-greeter.svg">
    </a>
  </p>
</div>

[Web Greeter][web-greeter] is created with Python... which sometimes is slow. So, I wanted to re-create it with Node.js!

This is a LightDM Greeter made with [Electron.js][Electron] and [node-gtk][node-gtk] that allows to create web based themes with HTMl, CSS and JavaScript. Also, this could be considered as a side project of [web-greeter][web-greeter], both being equal in behavior, but this one is easier to mantain~

## Features

- Create themes with HTML, CSS and JavaScript!
- Should work everywhere.
- JavaScript error handling, allowing to load the default theme.
- Themes could be simple, or very complex.
- Battery and brightness control.
- Multi-monitor support, thanks to [s0](https://github.com/s0)
- TypeScript based.

## Considerations

Themes working in **web-greeter** should work also here. All themes shipped with **web-greeter** are found here as well.

- `icon_theme` configuration is not loaded, as GTK apps don't allow to set a different **X-Cursor-Theme**

## Dependencies

### Build dependencies

- Node.js (v12, v14 and v16 are supported)
- Python 3
- base-devel (build-essentials)

### Common dependencies

- lightdm (as obvious)
- gobject-introspection
- liblightdm-gobject
- liblightdm-gobject-dev
- libgirepository1.0-dev
- libcairo2
- libcairo2-dev
- libxcb-dev
- libx11-dev

## Installation

```sh
git clone https://github.com/JezerM/nody-greeter.git
cd nody-greeter
npm install
npm run rebuild
npm run build
sudo node make install
```

This will rebuild **electron** along with **node-gtk**, compile typescript with `npx tsc`, and then build the package root directory inside `build/unpacked`. Later, install it with `node make install`.

Also, you can package `build/unpacked` to whatever you want, like **.deb** with:
```sh
dpkg-deb --root-owner-group --build unpacked
```

## Theme JavaScript API

To create themes for nody-greeter and web-greeter, check the documentation available at [web-greeter-docs][web-greeter-docs].

Also, you can install the TypeScript types definitions inside your theme with npm:

```sh
npm install nody-greeter-types
```

## Aditional features

### Brightness control
`acpi` is the only tool needed to control the brightness, besides a compatible device. This functionality is based on [acpilight][acpilight] replacement for `xbacklight`.

udev rules are needed to be applied before using it, check [acpilight rules][acpilight_rules]. Then, lightdm will need to be allowed to change backlight values, to do so add lightdm user to **video** group: `sudo usermod -a -G video lightdm`

You can enable it inside `/etc/lightdm/web-greeter.yml`

### Battery status
`acpi` and `acpi_listen` are the only tools you need (and a battery). This functionality is based on ["bat" widget][bat_widget] from ["lain" awesome-wm library][lain].

You can enable it inside `/etc/lightdm/web-greeter.yml`.

## Debugging
You can run the greeter from within your desktop session if you add the following line to the desktop file for your session located in `/usr/share/xsessions/`: `X-LightDM-Allow-Greeter=true`.

You have to log out and log back in after adding that line. Then you can run the greeter from command line.

Themes can be opened with a debug console if you set `debug_mode` as `true` inside `/etc/lightdm/web-greeter.yml`. Or, you could run the `nody-greeter` with the parameter `--debug`. I recommend to use the last one, as it is easier and handy.

```sh
nody-greeter --debug
```

Check `nody-greeter --help` for more commands.

> ***Note:*** Do not use `lightdm --test-mode` as it is not supported.

## Troubleshooting

### node-gyp fails on `npm run rebuild`

> Supported Node.js versions: 12, 14, 15, 16 (other versions should work but are untested)

Make sure you are using a [node-gtk][node-gtk] supported Node.js version.


[web-greeter]: https://github.com/JezerM/web-greeter "Web Greeter"
[nody-greeter-types]: https://github.com/JezerM/nody-greeter-types "nody-greeter-types" 
[web-greeter-docs]: https://jezerm.github.io/web-greeter-page/docs/ "API Documentation"
[acpilight]: https://gitlab.com/wavexx/acpilight/ "acpilight"
[acpilight_rules]: https://gitlab.com/wavexx/acpilight/-/blob/master/90-backlight.rules "udev rules"
[bat_widget]: https://github.com/lcpz/lain/blob/master/widget/bat.lua "Battery widget"
[lain]: https://github.com/lcpz/lain "Lain awesome library"
[Electron]: https://www.electronjs.org "Electron"
[node-gtk]: https://github.com/romgrk/node-gtk "Node GTK"
