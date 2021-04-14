/*

#define W	0.5
#define AS 	 2
#define BS 	 1
#define R 	 1
#define L	-1


 w : !(W)F(BS,R)
p1 : F(s,o) : s == AS && o == R -> F(AS,L)F(BS,R)
p2 : F(s,o) : s == AS && o == L -> F(BS,L)F(AS,R)
p3 : F(s,o) : s == BS	        -> F(AS,o)

p1 : F(s,o) : s == 2 && o ==  1 -> F(2,-1)F(1, 1)
p2 : F(s,o) : s == 2 && o == -1 -> F(1,-1)F(2, 1)
p3 : F(s,o) : s == 1 &&         -> F(2, o)

!(0.5)F(1,1)
!(0.5)F(2,1)
!(0.5)F(2,-1)F(1,1)
!(0.5)F(1,-1)F(2,1)F(2,1)

rule p2
F(1,-1)F(2,1)F(2,1)
rule p3

*/

const vm = require('vm');

export class BadRuleError extends Error { }
export class BadVariableDefinitionError extends Error { }

export default class LsysParametric {
	interpolateVarsRe = null; // /(\$\w+)/g;
	str2reRe = /(\w+)\(([^)]+)\)/g;
	generation = 0;
	totalGenerations = null;
	contants = null;
	options = {};
	vMcontext = {};

	constructor(options = {}) {
		if (!options.logger) {
			options.logger = { info: () => { } };
			options.logger.silly = options.logger.verbose = options.logger.debug = options.logger.warn = options.logger.info;
		}

		this._setOptions(options);

		this.content = '';

		this._castRules();
		this._castcontants();

		this.options.logger.info('Made new LsysParametric.\ncontants: %O\nRules:\n%O', this.contants, this.options.rules);
	}

	_setOptions(options = {}) {
		if (typeof options !== 'object') {
			throw new TypeError('options was not an object, %O', options);
		}

		this.options.logger = options.logger;
		delete options.logger;

		this.options.logger.info('setOptions: ', options);

		Object.keys(options).forEach(i => {
			if (typeof options[i] === 'string') {
				if (options[i].match(/^\s*[.\d+]+\s*$/)) {
					options[i] = parseFloat(options[i]);
				}
				else if (options[i].match(/^\d+$/)) {
					options[i] = Number(options[i]);
				}
			}
			if (options[i] !== 'undefined') {
				this.options[i] = options[i];
				this.options.logger.silly('SET OPTIONS "%s" to "%s"', i, options[i]);
			}
		});
	}

	_castcontants(str) {
		str = str || this.options.contants;
		if (!str) return;
		let rv = {};
		str.split(/[\n\r\f]+/).forEach((line) => {
			// Detect
			const name2val = line.match(/^\s*(#define)?\s*(\$\w+)\s*(\S+)\s*$/);
			// Store
			if (name2val) {
				rv[name2val[2]] = name2val[3];
				// Cast
				if (rv[name2val[2]].match(/^(-+)?\d+(\.\d+)?$/)) {
					rv[name2val[2]] = parseFloat(rv[name2val[2]]);
				}
			} else {
				throw new BadVariableDefinitionError("Bad variable definition:\n" + name2val + "\non line: \n" + line);
			}
		});
		this.contants = rv;
		return rv;
	}

	/**
	 * Creates a strucure as follows:
	 *
	 * 	[ [to_match, condition, substitution ], ...]
	 */
	_castRules(strRules) {
		strRules = strRules || this.options.rules;

		if (!strRules) {
			throw new TypeError('No rules?');
		}

		const rv = [];

		// F(s,o) : s == AS && o == R -> F(AS,L)F(BS,R) \n
		strRules.split(/[\n\r\f]+/).forEach((line) => {
			if (line === '') {
				return;
			}
			let rule = '';
			const headTail = line.match(/^\s*(.+?)\s*->\s*([^\n\r\f]+)\s*/);

			if (headTail != null) {
				const matchCondition = headTail[1].match(/([^:]+)\s*:?\s*(.*?)\s*$/);
				const head = matchCondition[1].match(/^(.+?)\s*$/);
				rule = [
					head[1],
					matchCondition[2],
					headTail[2]
				];
			} else {
				throw new BadRuleError('Parse error ' + line);
			}
			rv.push(rule);
		});

		this.options.rules = rv;
		return rv;
	}

	generate(generations = 0) {
		if (generations === 0) {
			throw new TypeError('Called .generate() without an argument');
		}

		this.totalGenerations = generations;
		this.options.logger.info('Generate %d generations', this.totalGenerations);

		this.content = this.options.start;
		this.content = this._interploateVars(this.content);

		for (this.generation = 1; this.generation <= this.totalGenerations; this.generation++) {
			this._applyRules();
		}

		if (typeof this.options.postRenderCallback === 'function') {
			this.options.logger.verbose('Call postRenderCallback', this.options.postRenderCallback(this.content));
			this.options.postRenderCallback();
			this.options.logger.verbose('Done  postRenderCallback');
		}

		this.options.logger.verbose('Leave generate');
		return this;
	}

	_interploateVars(str) {
		const rv = str.replace(
			this.interpolateVarsRe,
			(match) => (typeof this.contants[match] !== 'undefined') ? this.contants[match] : match
		);
		this.options.logger.verbose('Interpolate vars: %s ... %s', str, rv, this.interpolateVarsRe);
		if (rv === null) {
			return rv;
		}
		return rv === Number(rv) ? Number(rv) : rv;
	}

	_string2reAndArgNames(str) {
		let argNames = [];

		const rv = str.replace(
			this.str2reRe,
			(match, varname, argsCsv) => {
				argNames = argsCsv.split(/\s*,\s*/);
				// Could cache these based on args.length:
				return '(' + varname + ')\\(' + argNames.map(() => {
					return '([\\$\\w-]+)'
				}) + '\\)';
			}
		);

		return [
			new RegExp(rv, 'g'),
			argNames
		];
	}

	_applyRules() {
		this.options.logger.silly('Enter applyRules for generation ' + this.generation);
		let finalContent = '';

		// Itterate over atoms within the content:
		const atoms = this.content.match(/(.(\([^)]+\))?)/g);
		if (this.content != atoms.join('')) {
			this.options.logger.error(atoms);
			this.options.logger.error('atoms ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
			throw new Error('Atomic regex failed, results would be wrong');
		}

		// Run production rules:
		atoms.forEach((atom) => {
			let ruleNumber = 0;
			let ruleSuccessfullyApplied = false;

			this.options.rules.forEach((rule) => {
				ruleNumber++;

				if (ruleSuccessfullyApplied) {
					this.options.logger.silly('Skip rule ' + ruleNumber + ' as have made substituion');
					return;
				}

				// Re-write the rule to replace contants with literals where possible:
				const [rule2findRe, ruleArgNames] = this._string2reAndArgNames(rule[0]);

				this.options.logger.silly('Rule ' + ruleNumber + ' says find ' + rule[0] + ' in content of ' + atom + ' using ', rule2findRe);

				// Find the rule pattern (left-hand side of condition) and replace if condition is met
				const atomAfterRuleApplied = atom.replace(
					rule2findRe,
					([original, ..._arguments]) => {
						/*  On entering this function, a match has been found but rules have yet to be tested */
						// Ascribe contants
						let i = 0;
						_arguments.filter(str => str.match(/\d+/)).forEach((numericValue) => {
							this.contants[ruleArgNames[i]] = numericValue;
							i++;
						});

						// Get the rule code:
						const ruleConditionJs = this._interploateVars(rule[1]);
						this.options.logger.silly('Rule ' + ruleNumber + ' condition: ' + ruleConditionJs);

						// Decide if the substitution should take place:
						let ruleConditionMet = ruleConditionJs.length === 0; // || eval ruleConditionMet

						if (!ruleConditionMet) {
							try {
								// ruleConditionMet = eval(ruleConditionJs);
								vm.runInContext(ruleConditionJs, this.vMcontext);
							} catch (e) {
								this.options.logger.warn(e);
							}
						}

						// No substitutions:
						if (!ruleConditionMet) {
							this.options.logger.silly('Condition not met');
							return original;
						}

						ruleSuccessfullyApplied = true;
						const substituted = this._interploateVars(rule[2]);
						this.options.logger.silly('Condition met:------> substituted result = ' + rule[2] + '  RV== ' + substituted);

						return substituted;
					} // end of replacement function
				); // end of replacement call

				// If the rule is not met, the replacement value will be undefined,
				// do not write this into the string:
				if (ruleSuccessfullyApplied) {
					atom = atomAfterRuleApplied;
					this.options.logger.silly('After fulfilled rule ' + ruleNumber + ' was applied, atom is: ' + atom);
					return; // next
				}

			}); // Next rule

			finalContent += atom;
		}); // Next atom

		this.content = finalContent;

		this.options.logger.silly('After all rules were applied, content is: ', this.content);
		this.options.logger.verbose(
			'# FINAL for generation ' + this.generation + '/' + this.totalGenerations +
			'\n################################################\nContent: ' + this.content
		);
	}

}
