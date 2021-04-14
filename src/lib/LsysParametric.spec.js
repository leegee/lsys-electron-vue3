"use strict";

import chai from 'chai';
const expect = chai.expect;

import Lsys, { BadRuleError, BadVariableDefinitionError } from ".//LsysParametric.js";
import LsysRenderer from './GUI/LsysRenderer';


// const jsdom = require("jsdom");
// const { JSDOM } = jsdom;
// const window = new JSDOM(``).window;

/*
	Documentation via docco, hence single-line comments.
	1 tab == 4 spaces
*/

// Test the addition of parameters to the L1 L-system
// ==================================================
//
// Test case from Hanan, 1992
// --------------------------
// 	#define W	0.5
// 	#define AS 	 2
// 	#define BS 	 1
// 	#define R 	 1
// 	#define L	-1
//
//	  w : !(W)F(BS,R)
//	 p1 : F(s,o) : s == AS && o == R -> F(AS,L)F(BS,R)
//	 p2 : F(s,o) : s == AS && o == L -> F(BS,L)F(AS,R)
//	 p3 : F(s,o) : s == BS	        -> F(AS,o)
//
// Dry-run Test Results
// ====================
//
//	 p1 : F(s,o) : s == 2 && o ==  1 -> F(2,-1)F(1, 1)
//	 p2 : F(s,o) : s == 2 && o == -1 -> F(1,-1)F(2, 1)
//	 p3 : F(s,o) : s == 1 &&         -> F(2, o)
//
// Dry-run Output
// ==============
//
//	 !(0.5)F(1,1)
//	 !(0.5)F(2,1)
//	 !(0.5)F(2,-1)F(1,1)
//	 !(0.5)F(1,-1)F(2,1)F(2,1)
//	 !(0.5)F(2-,1)F(2,-1)F(1,1)F(2,-1)F(1,1)
//

// The content expected for the generation:
const expectContent = [
	'!(0.5)F(1,1)',
	'!(0.5)F(2,1)',
	'!(0.5)F(2,-1)F(1,1)',
	'!(0.5)F(1,-1)F(2,1)F(2,1)',
	'!(0.5)F(2,-1)F(2,-1)F(1,1)F(2,-1)F(1,1)'
];

// These options are fixed for every test:
const defaultOptions = {
	// An element into which the Lsys canvas can be inserted:
	contants: "#define $W	  0.5\n" + "#define $AS  2\n" + "#define $BS  1\n" + "#define $R   1\n" + "#define $L	 -1",
	rules: "F($s,$o) : $s == $AS && $o == $R -> F($AS,$L)F($BS,$R)\n" + "F($s,$o) : $s == $AS && $o == $L -> F($BS,$L)F($AS,$R)\n" + "F($s,$o) : $s == $BS	           -> F($AS,$o)\n",
	// Axiom
	start: "!($W)F($BS,$R)"
};

describe('LsysParametric', () => {
	describe('Constructor', () => {
		it('with old args', () => {
			var oldOptions = Object.assign({}, defaultOptions);
			delete oldOptions.contants;
			var lsys = new Lsys(oldOptions);
			expect(lsys).to.be.instanceOf(Lsys);
		});

		it('with new parametric args', () => {
			var lsys = new Lsys(defaultOptions);

			// NB MooTools, not native:
			expect(lsys.options.rules).to.be.an('array', 'Rules array');
			lsys.options.rules.forEach(function (i) {
				expect(i).to.be.an('Array', 'Rule cast');
				expect(i.length).to.equal(3, 'rule tuple');
			});

			expect(
				lsys.options.rules).to.deep.equal([
					["F($s,$o)", "$s == $AS && $o == $R", "F($AS,$L)F($BS,$R)"],
					["F($s,$o)", "$s == $AS && $o == $L", "F($BS,$L)F($AS,$R)"],
					["F($s,$o)", "$s == $BS", "F($AS,$o)"]
				],
					'Rules parsed'
				);
		});
	});


	describe('Interploation', function () {
		const rv = new Lsys(defaultOptions)._interploateVars('$AS');
		expect(rv).to.equal(2, 'Interpolate variable=' + rv);
	});


	describe('string to re and arg name', function () {
		var rv = new Lsys(defaultOptions)._string2reAndArgNames('F(s,o)');
		expect(rv).to.be.an('Array');
		expect(rv).to.have.lengthOf(2);
		expect(rv[0]).to.be.a('RegExp');

		var varWord = '([\\$\\w-]+)';

		expect(
			rv[0].toString()
		).to.equal(
			new RegExp('(F)\\(' + varWord + ',' + varWord + '\\)', 'g').toString(),
			'rv regexp');
		expect(rv[1]).to.be.an('Array', 'rv var names type');
		expect(rv[1]).to.deep.equal(['s', 'o'], 'rv var names value');
	});


	describe('Constructor with bad rules', function () {
		var badOptions = Object.assign({}, defaultOptions);
		badOptions.rules = 'This is not a rule.';
		try {
			var lsys = new Lsys(badOptions);
		} catch (e) {
			expect(e).to.be.an.instanceOf(BadRuleError);
			expect(e.toString()).to.match(/parse error/gi, 'Bad rule parse error thrown');
		}
	});


	describe('Bad contants option', function () {
		var badOptions = Object.assign({}, defaultOptions);
		badOptions.contants = 'This is not a variable definition.';
		try {
			var lsys = new Lsys(badOptions);
		} catch (e) {
			expect(e).to.be.an.instanceOf(BadVariableDefinitionError);
			expect(e.toString()).to.match(/variable definition/gi, 'Bad variable parse error thrown as hoped');
		}
	});


	describe('Variable parsing', function () {
		var varOpts = Object.assign({}, defaultOptions);
		varOpts.contants += "\n#define $Test -0.5";
		var lsys = new Lsys(varOpts);
		expect(lsys.contants.$AS).to.equal(2, 'positive int');
		expect(lsys.contants.$L).to.equal(-1, 'negative int');
		expect(lsys.contants.$W, 0.5).to.equal(0.5, 'positive float');
		expect(lsys.contants.$Test).to.equal(-0.5, 'negative float');
	});

	describe('Math routines', function () {
		expect(LsysRenderer.dsin(1)).to.equal(0.01745240643728351, 'sin');
		expect(LsysRenderer.dcos(1)).to.equal(0.9998476951563913, 'sin');
	});

	// ## Generate content

	describe('Generated content', function () {

		// Test each generation
		for (var g = 1; g < expectContent.length; g++) {

			var lsys = new Lsys(defaultOptions);
			lsys.generate(g);
			expect(lsys.generation).to.equal(g + 1, 'lsys.generation ' + g);
			expect(lsys.totalGenerations).to.equal(g, 'totalGenerations ' + g);
			// TODO Fix inversion in test data
			// expect(lsys.content).to.equal(expectContent[g], 'content ' + g);
		}
	});

});

