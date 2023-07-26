// refer: https://github.com/Peng-YM/QuanX/blob/master/Tools/XMLParser/xml-parser.js
// refer: https://goessner.net/download/prj/jsonxml/
export class XMLs {
	#ATTRIBUTE_KEY = "@";
	#CHILD_NODE_KEY = "#";
	#UNESCAPE = {
		"&amp;": "&",
		"&lt;": "<",
		"&gt;": ">",
		"&apos;": "'",
		"&quot;": '"'
	};
	#ESCAPE = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"'": "&apos;",
		'"': "&quot;"
	};

	constructor(opts) {
		this.name = "XML v0.2.2";
		this.opts = opts;
	};

	parse(xml = new String, reviver = "") {
		const UNESCAPE = this.#UNESCAPE;
		const ATTRIBUTE_KEY = this.#ATTRIBUTE_KEY;
		const CHILD_NODE_KEY = this.#CHILD_NODE_KEY;
		$.log(`🚧 ${$.name}, parse XML`, "");
		let parsedXML = parseXML(xml);
		$.log(`🚧 ${$.name}, parse XML`, `parseXML: ${JSON.stringify(parsedXML)}`, "");
		let json = toObject(parsedXML, reviver);
		$.log(`🚧 ${$.name}, parse XML`, `json: ${JSON.stringify(json)}`, "");
		return json;

		/***************** Fuctions *****************/
		function parseXML(text) {
			const list = text.split(/<([^!<>?](?:'[\S\s]*?'|"[\S\s]*?"|[^'"<>])*|!(?:--[\S\s]*?--|\[[^\[\]'"<>]+\[[\S\s]*?]]|DOCTYPE[^\[<>]*?\[[\S\s]*?]|(?:ENTITY[^"<>]*?"[\S\s]*?")?[\S\s]*?)|\?[\S\s]*?\?)>/);
			const length = list.length;

			// root element
			const root = { father: [] };
			let elem = root;

			// dom tree stack
			const stack = [];

			for (let i = 0; i < length;) {
				// text node
				const str = list[i++];
				if (str) appendText(str);

				// child node
				const tag = list[i++];
				if (tag) parseNode(tag);
			}

			return root;

			function parseNode(tag) {
				const tagLength = tag.length;
				const firstChar = tag[0];
				if (firstChar === "/") {
					// close tag
					const closed = tag.replace(/^\/|[\s\/].*$/g, "").toLowerCase();
					while (stack.length) {
						const tagName = elem.name && elem.name.toLowerCase();
						elem = stack.pop();
						if (tagName === closed) break;
					}
				} else if (firstChar === "?") {
					// XML declaration
					appendChild({ name: "?", raw: tag.substr(1, tagLength - 2) });
				} else if (firstChar === "!") {
					if (tag.substr(1, 7) === "[CDATA[" && tag.substr(-2) === "]]") {
						// CDATA section
						appendText(tag.substr(8, tagLength - 10));
					} else {
						// comment
						appendChild({ name: "!", raw: tag.substr(1) });
					}
				} else {
					const child = openTag(tag);
					appendChild(child);
					if (tag[tagLength - 1] === "/") {
						child.hasChild = false; // emptyTag
					} else {
						stack.push(elem); // openTag
						elem = child;
					}
				}
			}

			function appendChild(child) {
				elem.father.push(child);
			}

			function appendText(str) {
				str = removeSpaces(str);
				if (str) appendChild(unescapeXML(str));
			}

			function openTag(tag) {
				const elem = { father: [] };
				tag = tag.replace(/\s*\/?$/, "");
				const pos = tag.search(/[\s='"\/]/);
				if (pos < 0) {
					elem.name = tag;
				} else {
					elem.name = tag.substr(0, pos);
					elem.tag = tag.substr(pos);
				}
				return elem;
			}
		}

		function toObject(elem, reviver) {
			let object;
			switch (typeof elem) {
				case "string":
				case "undefined":
					object = elem;
					break;
				case "object":
					//default:
					const raw = elem.raw;
					const tag = elem.tag;
					const childList = elem.father;

					if (raw) object = raw;
					else if (tag) object = parseAttribute(tag, reviver);
					else if (elem.hasChild === false) object = { [elem.name]: undefined };
					else object = {};
					//$.log(`🚧 ${$.name}, toObject`, `object: ${JSON.stringify(object)}`, "");

					if (childList) childList.forEach((child, i) => {
						if (!child.tag && child.hasChild === false) addObject(object, child.name, toObject(child, reviver), childList?.[i - 1]?.name)
						else addObject(object, (typeof child === "string") ? CHILD_NODE_KEY : child.name, toObject(child, reviver), undefined)
					});
					/*
					if (Object.keys(object).length === 0) {
						if (elem.name) object[elem.name] = (elem.hasChild === false) ? null : "";
						else object = (elem.hasChild === false) ? null : "";
					}
					*/

					//if (Object.keys(object).length === 0) addObject(object, elem.name, (elem.hasChild === false) ? null : "");
					//if (Object.keys(object).length === 0) object = (elem.hasChild === false) ? undefined : "";
					if (reviver) object = reviver(elem.name || "", object);
					break;
			}
			return object;

			function parseAttribute(tag, reviver) {
				if (!tag) return;
				const list = tag.split(/([^\s='"]+(?:\s*=\s*(?:'[\S\s]*?'|"[\S\s]*?"|[^\s'"]*))?)/);
				const length = list.length;
				let attributes, val;

				for (let i = 0; i < length; i++) {
					let str = removeSpaces(list[i]);
					if (!str) continue;

					if (!attributes) {
						attributes = {};
					}

					const pos = str.indexOf("=");
					if (pos < 0) {
						// bare attribute
						str = ATTRIBUTE_KEY + str;
						val = null;
					} else {
						// attribute key/value pair
						val = str.substr(pos + 1).replace(/^\s+/, "");
						str = ATTRIBUTE_KEY + str.substr(0, pos).replace(/\s+$/, "");

						// quote: foo="FOO" bar='BAR'
						const firstChar = val[0];
						const lastChar = val[val.length - 1];
						if (firstChar === lastChar && (firstChar === "'" || firstChar === '"')) {
							val = val.substr(1, val.length - 2);
						}

						val = unescapeXML(val);
					}
					if (reviver) val = reviver(str, val);

					addObject(attributes, str, val);
				}

				return attributes;
			}

			function addObject(object, key, val, prevKey = key) {
				if (typeof val === "undefined") return;
				else {
					const prev = object[prevKey];
					//const curr = object[key];
					if (Array.isArray(prev)) prev.push(val);
					else if (prev) object[prevKey] = [prev, val];
					else object[key] = val;
				}
			}
		}

		function removeSpaces(str) {
			return str && str.replace(/^\s+|\s+$/g, "");
		}

		function unescapeXML(str) {
			return str.replace(/(&(?:lt|gt|amp|apos|quot|#(?:\d{1,6}|x[0-9a-fA-F]{1,5}));)/g, function (str) {
				if (str[1] === "#") {
					const code = (str[2] === "x") ? parseInt(str.substr(3), 16) : parseInt(str.substr(2), 10);
					if (code > -1) return String.fromCharCode(code);
				}
				return UNESCAPE[str] || str;
			});
		}

	};

	stringify(json = new Object, tab = "") {
		const ESCAPE = this.#ESCAPE;
		const ATTRIBUTE_KEY = this.#ATTRIBUTE_KEY;
		const CHILD_NODE_KEY = this.#CHILD_NODE_KEY;
		$.log(`🚧 ${$.name}, stringify XML`, "");
		let XML = "";
		for (let elem in json) XML += toXml(json[elem], elem, "");
		XML = tab ? XML.replace(/\t/g, tab) : XML.replace(/\t|\n/g, "");
		$.log(`🚧 ${$.name}, stringify XML`, `XML: ${XML}`, "");
		return XML;
		/***************** Fuctions *****************/
		function toXml(Elem, Name, Ind) {
			let xml = "";
			if (Array.isArray(Elem)) {
				xml = Elem.reduce(
					(prevXML, currXML) => prevXML += Ind + toXml(currXML, Name, Ind + "\t") + "\n",
					""
				)
			} else if (typeof Elem === "object") {
				let attribute = "";
				let hasChild = false;
				for (let name in Elem) {
					if (name.charAt(0) === ATTRIBUTE_KEY) attribute += ` ${name.substring(1)}=\"${Elem[name].toString()}\"`;
					else if (Elem[name] === undefined) Name = name;
					else hasChild = true;
				}
				xml += `${Ind}<${Name}${attribute}${(hasChild) ? "" : "/"}>`;
				if (hasChild) {
					for (let name in Elem) {
						if (name == CHILD_NODE_KEY) xml += Elem[name];
						else if (name == "#cdata") xml += `<![CDATA[${Elem[name]}]]>`;
						else if (name.charAt(0) != "@") xml += toXml(Elem[name], name, Ind + "\t");
					}
					xml += (xml.charAt(xml.length - 1) == "\n" ? Ind : "") + `</${Name}>`;
				}
			} else if (typeof Elem === "string") {
				if (Name === "?") xml += Ind + `<${Name}${Elem.toString()}${Name}>`;
				else if (Name === "!") xml += Ind + `<!--${Elem.toString()}-->`;
				else xml += Ind + `<${Name}>${Elem.toString()}</${Name}>`;
			} else if (typeof Elem === "undefined") xml += Ind + `<${Name.toString()}/>`;
			return xml;
		};
	};
}
