(function (isBrowser, document) {
	'use strict';

	function isString(value) {
		return typeof value === 'string';
	}

	function identity(value) {
		return value;
	}

	// =======================================================================================

	function RepcombinatorRenderer(document, renderOptions) {
		function createNode(selector, children) {
			if (!isString(selector)) {
				throw new Error('Selector for creating a node can not be empty');
			}

			var classes = selector.split('.');
			var tagParts = classes.shift().split('#');
			var tagName = tagParts.shift();
			var id = tagParts.shift();

			if (!tagName) {
				throw new Error('No tag name found');
			}

			var node = document.createElement(tagName);
			classes
				.forEach(function (className) {
					node.classList.add(className);
				});

			(children || [])
				.filter(identity)
				.forEach(function (child) {
					if (isString(child)) {
						node.appendChild(document.createTextNode(child));
					} else {
						node.appendChild(child);
					}
				});

			return node;
		}

		// =======================================================================================

		function renderHeader(report) {
			var headerCells = report.order
				.map(function (headerName) {
					return createNode('th.report__header__name', [report.headers[headerName].name])
				});

			return createNode('thead', [
				createNode('tr.report__header', headerCells)
			]);
		}

		function renderBody(report) {
			var rows = report.rows
				.map(function (row) {
					var cells = report.order
						.map(function (headerName) {
							return createNode('td.report__row__cell', [row[headerName]]);
						});

					return createNode('tr.report__row', cells);
				});

			return createNode('tbody', rows);
		}

		function renderReport(report) {
			return createNode(
				'table.report', 
				[renderHeader(report), renderBody(report)]
			);
		}

		function rendererForCombinedReportInto(targetElement) {
			return function render(report) {
				targetElement.appendChild(renderReport(report));
			};
		}

		function Renderer(targetElement) {
			return {
				render: rendererForCombinedReportInto(targetElement)
			};
		}

		function into(selector) {
			var targetElement = document.querySelector(selector);

			if (!targetElement) {
				throw new Error('Selector ' + selector.toString() + ' does not match any elements');
			}

			return Renderer(targetElement);
		}

		return {
			into: into,
		};
	}

	function Repcombinator(options) {
		// Options
		var API_URL = (options && options.apiUrl) || '../api/';
		var HEADERS = assign(
			{ 'content-type': 'application/json' },
			options && options.headers
		);

		// =============================================

		var isArray = Array.isArray;

		function assign(target) {
			var sources = Array.prototype.slice.call(arguments);

			sources
				.filter(identity)
				.forEach(function (source) {
					Object.keys(source)
						.forEach(function (key) {
							target[key] = source[key]
						});
				});

			return target;
		}

		function nInList(n) {
			return function (list) {
				return list && list[n];
			};
		}

		function map(mapper, iterable) {
			if (isArray(iterable)) {
				return iterable.map(mapper);
			}

			return function (iterable) {
				return map(mapper, iterable);
			};
		}

		var first = nInList(0);
		var second = nInList(1);

		function isEqual(first, second) {
			if (second) {
				return first === second;
			}

			return function (second) {
				return isEqual(first, second);
			};
		}

		function getObjectEntries(obj) {
			return Object
				.keys(obj)
				.map(function (key) {
					return [key, obj[key]]
				});
		}

		function compose() {
			function callWithResult(result, func, index) {
				return [func.apply(null, result)];
			}
			var funcs = Array.prototype.slice.call(arguments);

			return function () {
				var firstArgs = Array.prototype.slice.call(arguments);

				return funcs
					.reverse()
					.reduce(callWithResult, firstArgs);
			}
		}

		/////////////////////////////////////////////////////////////

		function removeEmptyColumns(report, emptyColumns) {
			function indexNotIn(emptyColumns) {
				return function (_, index) {
					return isEqual(emptyColumns.indexOf(index), -1);
				}
			}


			report.headers = report.headers && report.headers.filter(indexNotIn(emptyColumns));
			report.rows = map(function (row) {
				return row.filter(indexNotIn(emptyColumns));
			})(report.rows || []);

			return report;
		}

		function keepNonEmptyColumns(report) {
			const emptyColumns = getEmptyColumns(report.rows);

			return removeEmptyColumns(report, emptyColumns);
		}

		function getEmptyColumns(rows) {
			const emptyRowMap = rows
				.map(function (rowValues) {
					return (rowValues || [])
						.reduce(function (acc, value, index) {
							return !value ? acc.concat(index) : acc
						}, [])
				})
				.reduce(
				function (acc, indexes) {
					indexes
						.forEach(function (index) {
							if (acc[index]) {
								acc[index] += 1;
							} else {
								acc[index] = 1;
							}
						});
					return acc;
				},
				{}
				);

			return getObjectEntries(emptyRowMap)
				.filter(compose(isEqual(rows.length), second))
				.map(first)
				.map(function (num) {
					return parseInt(num, 10)
				});
		}

		function createObjectRowsForReport(report) {
			var headers = (report.headers || {});
			var reportClone = {};

			Object.keys(report)
				.filter(function (key) {
					return ['rows', 'columns'].indexOf(key) === -1;
				})
				.forEach(function (key) {
					reportClone[key] = report[key];
				});

			if (!reportClone.headersMap) {
				reportClone.headerOrder = headers
					.map(function (header) {
						return header.column;
					});

				reportClone.headersMap = headers
					.reduce(function (acc, value) {
						acc[value.column] = value;
						return acc;
					}, {});
			}

			reportClone.objectRows = (report.rows || [])
				.map(function (rowValues) {
					var rowObject = {};

					rowValues
						.filter(identity)
						.forEach(function (value, index) {
							if (headers[index]) {
								rowObject[headers[index].column] = value;
							}
						});

					return rowObject;
				});

			return reportClone;
		}

		function combineObjectReports(objectReports) {
			return objectReports
				.reduce(function (acc, report) {
					acc.rows = acc.rows.concat(report.objectRows);

					acc.order = acc.order.concat(
						(report.headerOrder || [])
							.filter(function (value) {
								return acc.order.indexOf(value) === -1;
							})
					);

					Object
						.keys(report.headersMap)
						.forEach(function (headerKey) {
							acc.headers[headerKey] = report.headersMap[headerKey];
						});

					return acc;
				}, { rows: [], headers: {}, order: [] });
		}

		function getObjectBasedReport(report) {
			return createObjectRowsForReport(keepNonEmptyColumns(report));
		}

		function combineTableResults(reports) {
			return combineObjectReports(reports.map(getObjectBasedReport));
		}

		function isValidUid(uid) {
			return /[A-z]{1}[A-z0-9]{10}/.test(uid);
		}

		function isResponseOk(response) {
			if (response && response.ok) {
				return Promise.resolve(response);
			}

			return Promise.reject(new Error('Report could not be loaded'));
		}

		function extractResponseBody(response) {
			return response.json();
		}

		function requestReport(uid) {
			if (!isValidUid(uid)) {
				return Promise.reject(new Error(`A valid uid should be provided to requestReport, got (${uid})`));
			}

			var requestInit = {
				headers: HEADERS,
				redirect: 'error',
				credentials: 'include'
			};

			return fetch(`${API_URL}/reportTables/${uid}/data`, requestInit)
				.then(isResponseOk)
				.then(extractResponseBody);
		}

		function requestReports(uids) {
			if (!isArray(uids)) {
				return Promise.reject(new Error('Parameter to requestReports should be an array of uids'));
			}

			return Promise.all(map(requestReport, uids));
		}

		function getCombinedReportForReportUids(uids) {
			return requestReports(uids)
				.then(combineTableResults);
		}

		return {
			combineTableResults: combineTableResults,
			getObjectBasedReport: getObjectBasedReport,
			requestReports: requestReports,
			requestReport: requestReport,
			getCombinedReportForReportUids: getCombinedReportForReportUids,
			renderer: RepcombinatorRenderer(document, options && options.render)
		};
	}

	if (isBrowser) {
		window.Repcombinator = Repcombinator;
	} else {
		module.exports = Repcombinator;
	}
})('document' in this, document);
