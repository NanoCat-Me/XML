// refer: https://github.com/Peng-YM/QuanX/blob/master/Tools/XMLParser/xml-parser.js
// refer: https://goessner.net/download/prj/jsonxml/json2xml.js
function XMLs(opts) {
	return new (class {
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
			this.name = "XML v0.3.3";
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
				$.log(`🚧 ${$.name}, parseXML`, `list: ${JSON.stringify(list)}`, "");

				// root element
				const root = { children: [] };
				let elem = root;

				// dom tree stack
				const stack = [];

				// parse
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
					let child = {};
					switch (tag[0]) {
						case "/":
							// close tag
							const closed = tag.replace(/^\/|[\s\/].*$/g, "").toLowerCase();
							while (stack.length) {
								const tagName = elem?.name?.toLowerCase?.();
								elem = stack.pop();
								if (tagName === closed) break;
							}
							break;
						case "?":
							if (tag.slice(1, 4) === "xml") {
								// XML declaration
								child.name = "?xml";
								child.raw = tag.slice(5, -1);
								$.log(`🚧 ${$.name}, parseXML`, `XML declaration raw: ${tag.slice(5, -1)}`, "");
							} else {
								// XML declaration
								child.name = "?";
								child.raw = tag.slice(1, -1);
							};
							appendChild(child);
							break;
						case "!":
							if (tag.slice(1, 8) === "DOCTYPE") {
								// DOCTYPE section
								child.name = "!DOCTYPE";
								child.raw = tag.slice(9);
								$.log(`🚧 ${$.name}, parseXML`, `DOCTYPE raw: ${tag.slice(9)}`, "");
							} else if (tag.slice(1, 8) === "[CDATA[" && tag.slice(-2) === "]]") {
								// CDATA section
								child.name = "!CDATA";
								child.raw = tag.slice(9, -2);
								//appendText(tag.slice(9, -2));
								$.log(`🚧 ${$.name}, parseXML`, `CDATA text: ${tag.slice(9, -2)}`, "");
							} else {
								// Comment section
								child.name = "!";
								child.raw = tag.slice(1);
								$.log(`🚧 ${$.name}, parseXML`, `Comment raw: ${tag.slice(1)}`, "");
							};
							appendChild(child);
							break;
						default:
							child = openTag(tag);
							appendChild(child);
							switch (tag.slice(-1)) {
								case "/":
									//child.hasChild = false; // emptyTag
									delete child.children; // emptyTag
									break;
								default:
									stack.push(elem); // openTag
									elem = child;
									break;
							}
							break;
					}

					function openTag(tag) {
						const elem = { children: [] };
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

				function appendText(str) {
					//str = removeSpaces(str);
					str = removeBreakLine(str);
					//str = str?.trim?.();
					if (str) appendChild(unescapeXML(str));

					function removeBreakLine(str) {
						return str?.replace?.(/^(\r\n|\r|\n|\t)+|(\r\n|\r|\n|\t)+$/g, "");
					}
				}

				function appendChild(child) {
					elem.children.push(child);
				}
			}

			function PlistToObject(elem, reviver) {
				$.log(`🚧 ${$.name}, PlistToObject`, `elem: ${JSON.stringify(elem)}`, "");

				let object;
				switch (typeof elem) {
					case "string":
					case "undefined":
						object = elem;
						break;
					case "object":
						//default:
						//const raw = elem.raw;
						const name = elem.name;
						//const tag = elem.tag;
						const children = elem.children;

						//if (raw) object = raw;
						//else if (tag) object = parseAttribute(tag, reviver);
						//else if (!children) object = { [name]: undefined };
						//else object = {};
						object = {};
						$.log(`🚧 ${$.name}, PlistToObject`, `object: ${JSON.stringify(object)}`, "");

						switch (name) {
							case "plist":
								let plist = PlistToObject(children[0], reviver);
								object = Object.assign(object, plist)
								break;
							case "dict":
								let dict = children.map(child => PlistToObject(child, reviver));
								$.log(`🚧 ${$.name}, PlistToObject`, `middle dict: ${JSON.stringify(dict)}`, "");
								dict = chunk(dict, 2);
								object = Object.fromEntries(dict);
								$.log(`🚧 ${$.name}, PlistToObject`, `after dict: ${JSON.stringify(dict)}`, "");
								break;
							case "array":
								if (!Array.isArray(object)) object = [];
								object = children.map(child => PlistToObject(child, reviver));
								break;
							case "key":
								const key = children[0];
								$.log(`🚧 ${$.name}, PlistToObject`, `key: ${key}`, "");
								object = key;
								break;
							case "true":
							case "false":
								const boolean = name;
								$.log(`🚧 ${$.name}, PlistToObject`, `boolean: ${boolean}`, "");
								object = JSON.parse(name);
								break;
							case "integer":
								const integer = children[0];
								$.log(`🚧 ${$.name}, PlistToObject`, `integer: ${integer}`, "");
								object = parseInt(children[0]);
								break;
							case "real":
								const real = children[0];
								$.log(`🚧 ${$.name}, PlistToObject`, `real: ${real}`, "");
								object = parseFloat(children[0]);
								break;
							case "string":
								const string = children[0];
								$.log(`🚧 ${$.name}, PlistToObject`, `string: ${string}`, "");
								object = children[0];
								break;
						};
						if (reviver) object = reviver(name || "", object);
						break;
				}
				$.log(`✅ ${$.name}, PlistToObject`, `object: ${JSON.stringify(object)}`, "");
				return object;

				/** 
				 * Chunk Array
				 * @author VirgilClyne
				 * @param {Array} source - source
				 * @param {Number} length - number
				 * @return {Array<*>} target
				 */
				function chunk(source, length) {
					$.log(`☑️ ${$.name}, Chunk Array`, "");
					var index = 0, target = [];
					while (index < source.length) target.push(source.slice(index, index += length));
					$.log(`✅ ${$.name}, Chunk Array`, `target: ${JSON.stringify(target)}`, "");
					return target;
				};
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
						const name = elem.name;
						const tag = elem.tag;
						const children = elem.children;

						if (raw) object = raw;
						else if (tag) object = parseAttribute(tag, reviver);
						else if (!children) object = { [name]: undefined };
						else object = {};
						//$.log(`🚧 ${$.name}, toObject`, `object: ${JSON.stringify(object)}`, "");

						if (name === "plist") object = Object.assign(object, PlistToObject(children[0], reviver));
						else if (children) children.forEach((child, i) => {
							if (typeof child === "string") addObject(object, CHILD_NODE_KEY, toObject(child, reviver), undefined)
							else if (!child.tag && !child.children && !child.raw) addObject(object, child.name, toObject(child, reviver), children?.[i - 1]?.name)
							else addObject(object, child.name, toObject(child, reviver), undefined)
						});

						/*
						if (Object.keys(object).length === 0) {
							if (elem.name) object[elem.name] = (elem.hasChild === false) ? null : "";
							else object = (elem.hasChild === false) ? null : "";
						}
						*/
						
						//if (Object.keys(object).length === 0) addObject(object, elem.name, (elem.hasChild === false) ? null : "");
						//if (Object.keys(object).length === 0) object = (elem.hasChild === false) ? undefined : "";
						if (reviver) object = reviver(name || "", object);
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
						//let str = removeBreakLine(list[i]);
						//let str = list[i]?.trim?.();
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

					function removeSpaces(str) {
						//return str && str.replace(/^\s+|\s+$/g, "");
						return str?.trim?.();
					}
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
					if (Name === "plist") xml += `${Ind}${PlistToXml(Elem[Name], Name, `${Ind}\t`)}\n`;
					else for (var i = 0, n = Elem.length; i < n; i++) xml += `${Ind}${toXml(Elem[i], Name, `${Ind}\t`)}\n`;
					/*
					xml = Elem.reduce(
						(prevXML, currXML) => prevXML += Ind + toXml(currXML, Name, `${Ind}\t`) + "\n",
						""
					);
					*/
				} else if (typeof Elem === "object") {
					switch (Name) {
						case "plist":
							xml += `${Ind}${PlistToXml(Elem[Name], Name, `${Ind}\t`)}\n`;
							break;
						default:
							let attribute = "";
							let hasChild = false;
							for (let name in Elem) {
								if (name[0] === ATTRIBUTE_KEY) attribute += ` ${name.substring(1)}=\"${Elem[name].toString()}\"`;
								else if (Elem[name] === undefined) Name = name;
								else hasChild = true;
							}
							xml += `${Ind}<${Name}${attribute}${(hasChild) ? "" : "/"}>`;
							if (hasChild) {
								for (let name in Elem) {
									switch (name) {
										case CHILD_NODE_KEY:
											xml += Elem[name];
											break;
										case "plist":
											xml += `${Ind}${PlistToXml(Elem[name], name, `${Ind}\t`)}\n`;
											break;
										default:
											if (name[0] != "@") xml += `${Ind}${toXml(Elem[name], name, `${Ind}\t`)}\n`;
											break;
									}
								}
								xml += (xml.slice(-1) == "\n" ? Ind : "") + `</${Name}>`;
							}
							break;
					}
				} else if (typeof Elem === "string") {
					switch (Name) {
						case "?xml":
							xml += Ind + `<${Name} ${Elem.toString()}?>`;
							break;
						case "?":
							xml += Ind + `<${Name}${Elem.toString()}${Name}>`;
							break;
						case "!":
							xml += Ind + `<!--${Elem.toString()}-->`;
							break;
						case "!DOCTYPE":
							xml += Ind + `<!DOCTYPE ${Elem.toString()}>`;
							break;
						case "!CDATA":
							xml += Ind + `<![CDATA[${Elem.toString()}]]>`;
						case CHILD_NODE_KEY:
							xml += Elem;
							break;
						default:
							xml += Ind + `<${Name}>${Elem.toString()}</${Name}>`;
					};
					/*
					if (Name === "?") xml += Ind + `<${Name}${Elem.toString()}${Name}>`;
					else if (Name === "!") xml += Ind + `<!--${Elem.toString()}-->`;
					else xml += Ind + `<${Name}>${Elem.toString()}</${Name}>`;
					*/
				} else if (typeof Elem === "undefined") xml += Ind + `<${Name.toString()}/>`;
				return xml;
			};

			function PlistToXml(Elem, Name, Ind) {
				let xml = "";
				switch (typeof Elem) {
					case "boolean":
						xml += `${Ind}<${Elem.toString()}/>`;
						break;
					case "number":
						if (Elem.toString().includes(".")) xml += `${Ind}<real>${Elem.toString()}</real>\n`;
						else xml += `${Ind}<integer>${Elem.toString()}</integer>\n`;
						break;
					case "string":
						xml += `${Ind}<string>${Elem.toString()}</string>\n`;
						break;
					case "object":
						if (Array.isArray(Elem)) {
							xml += `${Ind}<array>\n`;
							for (var i = 0, n = Elem.length; i < n; i++) xml += `${Ind}${PlistToXml(Elem[i], Name, `${Ind}\t`)}\n`;
							xml += `${Ind}</array>\n`;
						} else {
							xml += `${Ind}<dict>\n`;
							//for (let name in Elem) xml += PlistToXml(Elem[name], name, Ind + "\t");
							Object.entries(Elem).forEach(([key, value]) => {
								xml += `${Ind}<key>${key}</key>\n`;
								xml += PlistToXml(value, key, Ind);
							});
							xml += `${Ind}</dict>\n`;
						}
						break;
				}
				return xml;
			};
		};
	})(opts)
}
