const createObject = function(key, value, splitter = "/") {
  var obj = {};
  var parts = key.split(splitter);
  if (parts.length == 1) {
    obj[parts[0]] = value;
  } else if (parts.length > 1) {
    // concat all but the first part of the key
    var remainingParts = parts.slice(1, parts.length).join(splitter);
    obj[parts[0]] = createObject(remainingParts, value);
  }
  return obj;
};

function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

function mergeDeep(target, source) {
  let output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) Object.assign(output, { [key]: source[key] });
        else output[key] = mergeDeep(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

const nest = (data, splitter) => {
  let final = {};
  Object.keys(data).forEach(k => {
    const object = createObject(k, data[k], splitter);
    final = mergeDeep(final, object);
  });
  return final;
};

const getColor = (color, format) => {
  if (format == "HEX") {
    return color.toHexString();
  }
  if (format == "RGB") {
    return color.toRgbString();
  }
  if (format == "HSL") {
    return color.toHslString();
  }
};

const getName = (name = "", separator = " -> ") => {
  return name.split(separator)[0];
};

module.exports = {
  nest,
  getColor,
  getName
};
