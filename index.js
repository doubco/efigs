const fs = require("fs");
const axios = require("axios");
const tinycolor = require("tinycolor2");

const { nest, getColor, getName } = require("./helpers");

const scope = {
  token: process.env.TOKEN,
  file: process.env.FILE
};

const options = {
  raw: process.env.RAW,
  platform: process.env.PLATFORM || "JSON",
  colorFormat: process.env.COLORFORMAT || "HEX",
  splitter: process.env.SPLITTER || "/",
  separator: process.env.SEPARATOR || " -> "
};

(async () => {
  let metaStyles = [];
  let styles = [];

  console.log("----------------");
  console.log("");
  console.log("");
  console.log("efigs ❤️ export figma styles");
  console.log("");
  console.log("");
  console.log("----------------");
  console.log("");

  if (
    ["RGB", "HSL", "HEX"].includes(options.colorFormat) &&
    ["WEB", "JSON", "RN"].includes(options.platform) &&
    scope.token &&
    scope.file
  ) {
    if (options.raw) {
      console.log("> Will export RAW");
    } else {
      console.log(`→ PLATFORM: ${options.platform}`);
      console.log(`→ FORMAT: ${options.colorFormat}`);
    }

    console.log("> Getting file...");

    let stylesRes = await axios({
      method: "GET",
      url: `https://api.figma.com/v1/files/${scope.file}/styles`,
      headers: {
        "X-FIGMA-TOKEN": scope.token
      }
    });

    if (stylesRes && stylesRes.data && stylesRes.data.meta) {
      metaStyles = stylesRes.data.meta.styles.map(i => ({
        id: i.node_id,
        name: i.name,
        type: i.style_type
      }));

      console.log("> Getting nodes...");

      let nodesRes = await axios({
        method: "GET",
        url: `https://api.figma.com/v1/files/${
          scope.file
        }/nodes?ids=${metaStyles.map(i => i.id).join(",")}`,
        headers: {
          "X-FIGMA-TOKEN": scope.token
        }
      });

      if (nodesRes && nodesRes.data && nodesRes.data.nodes) {
        Object.keys(nodesRes.data.nodes).forEach(nid => {
          const node = nodesRes.data.nodes[nid];
          const meta = metaStyles.find(m => m.id == nid);

          if (meta.type == "TEXT") {
            styles.push({
              ...meta,
              style: {
                family: node.document.style.fontFamily,
                size: node.document.style.fontSize,
                weight: node.document.style.fontWeight,
                lineHeight: node.document.style.lineHeightPx
              }
            });
          }
          if (meta.type == "FILL") {
            styles.push({ ...meta, fills: node.document.fills });
          }
          if (meta.type == "EFFECT") {
            styles.push({ ...meta, effects: node.document.effects });
          }
        });
      }
    }

    if (options.raw) {
      fs.writeFileSync(
        `${__dirname}/styles.json`,
        JSON.stringify(styles, null, 2)
      );
    } else {
      let processed = {
        effects: {},
        palette: {},
        typography: {}
      };

      styles.forEach(s => {
        const name = getName(s.name, options.separator);
        if (s.type == "EFFECT") {
          s.effects.forEach(e => {
            if (e.type == "DROP_SHADOW") {
              const color = tinycolor.fromRatio(e.color);
              if (options.platform == "WEB") {
                if (!processed.effects[name]) {
                  processed.effects[name] = "";
                }
                const str = `${e.offset.x}px ${e.offset.y}px ${
                  e.radius
                }px ${color.toRgbString()}`;
                if (processed.effects[name].length) {
                  processed.effects[name] =
                    processed.effects[name] + ", " + str;
                } else {
                  processed.effects[name] = str;
                }
              } else {
                if (!processed.effects[name]) {
                  processed.effects[name] = [];
                }
                if (options.platform == "RN") {
                  processed.effects[name].push({
                    shadowColor: getColor(color, options.colorFormat),
                    shadowOffset: {
                      width: e.offset.x,
                      height: e.offset.y
                    },
                    shadowOpacity: parseFloat(color.getAlpha().toFixed(2)),
                    shadowRadius: e.radius
                  });
                }
                if (options.platform == "JSON") {
                  processed.effects[name].push({
                    color: getColor(color, options.colorFormat),
                    offset: e.offset,
                    opacity: parseFloat(color.getAlpha().toFixed(2)),
                    radius: e.radius
                  });
                }
              }
            }
            if (e.type == "BACKGROUND_BLUR") {
              if (!processed.effects[name]) {
                processed.effects[name] = [];
              }
              processed.effects[name].push({
                radius: e.radius
              });
            }
          });
        }
        if (s.type == "FILL") {
          s.fills.forEach(f => {
            if (f.type == "SOLID") {
              const color = tinycolor.fromRatio(f.color);
              processed.palette[name] = getColor(color, options.colorFormat);
            }
          });
        }
        if (s.type == "TEXT") {
          if (!processed.typography[name]) {
            processed.typography[name] = s.style;
          }
        }
      });

      let final = {
        effects: nest(processed.effects, options.splitter),
        palette: nest(processed.palette, options.splitter),
        typography: nest(processed.typography, options.splitter)
      };

      fs.writeFileSync(
        `${__dirname}/styles.json`,
        JSON.stringify(final, null, 2)
      );
    }
    console.log(`→ Ready at ${__dirname}/styles.json`);
  } else {
    console.log(`⚠️`);
    if (!["RGB", "HSL", "HEX"].includes(options.colorFormat)) {
      console.log(`→ INVALID FORMAT`);
    }
    if (!["WEB", "JSON", "RN"].includes(options.platform)) {
      console.log(`→ INVALID PLATFORM`);
    }
    if (!scope.token) {
      console.log(`→ NO TOKEN`);
    }
    if (!scope.file) {
      console.log(`→ NO FILE KEY`);
    }
  }
})();
