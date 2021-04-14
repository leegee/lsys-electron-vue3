const DEGREE_TO_RADIAN_FACTOR = Math.PI / 180.0;

const LsysRenderer = class LsysRenderer {
    preparedColours = [];
    settings = null;
    canvas = null;
    ctx = null;
    x = null;
    y = null;

    static dsin(degrees) {
        return Math.sin(degrees * DEGREE_TO_RADIAN_FACTOR)
    }

    static dcos(degrees) {
        return Math.cos(degrees * DEGREE_TO_RADIAN_FACTOR)
    }

    constructor(settings, canvas, logger) {
        if (!settings) {
            throw new TypeError('No settings object passed to LsysRenderer.new as first param');
        }
        if (!canvas) {
            throw new TypeError('No HTMLCanvasElement passed to LsysRenderer.new 2nd param');
        }
        if (!logger) {
            throw new TypeError('No Logger object passed to LsysRenderer.new as first param');
        }

        this.settings = settings;
        this.canvas = canvas;
        this.logger = logger;

        this.ctx = this.canvas.getContext("2d");

        this.logger.info('new LsysRenderer', this.settings, this.canvas);

        // Translate context to center of canvas:
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

        // XXX
        this.settings.initX = Number(this.settings.initX) || 0;
        this.settings.initY = Number(this.settings.initY) || 0;

        this.x = Number(this.settings.initX);
        this.y = Number(this.settings.initY);

        this.maxY = -Infinity;
        this.maxX = -Infinity;
        this.minX = Infinity;
        this.minY = Infinity;

        if (!this.settings.colours) {
            throw new TypeError('No colours supplied to new LsysRenderer() as "settings"');
        }

        for (let i = 0; i < this.settings.colours.length; i++) {
            this.preparedColours[i] = this._hexAndOpacityToRgba(this.settings.colours[i], this.settings.opacities[i])
        }

        this._setColour(0);
        this._setUpCanvas();

        // For example, to flip context vertically for specific L-systems:
        if (this.settings.initially && typeof this.settings.initially === 'function') {
            this.settings.initially.call(this);
        }
    }

    _setUpCanvas() {
        this.canvas.width = this.settings.canvasWidth;
        this.canvas.height = this.settings.canvasHeight;
        this.ctx.fillStyle = this.settings.canvasBackgroundColour;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.x = Number(this.settings.initX);
        this.y = Number(this.settings.initY);
    }

    render(content, midiRenderer) {
        midiRenderer.newRender();
        this._render({ content, draw: false, midiRenderer });

        this.resizeCanvas();

        this._render({ content, draw: true, midiRenderer });

        if (midiRenderer) {
            midiRenderer.afterFinalRender();
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _render({ content, draw, midiRenderer }) {
        this.logger.info('RENDER: draw:%s, midiRenderer:%s', draw, midiRenderer ? true : false);
        const states = [];
        this.punUp = false;
        let dir = 0;

        // PRODUCTION RULES:
        for (let i = 0; i < content.length; i++) {
            let draw = true;
            this.penUp = false;
            const atom = content.charAt(i).toLowerCase();

            this.logger.silly('Do content atom %d, (%s)', i, atom);

            switch (atom) {
                case 'f': // Forwards
                    break;

                case 'c': // Set colour
                    const colourCode = content.charAt(++i);
                    const index = parseInt(colourCode, 10) % this.settings.colours.length;
                    this.logger.silly('Got colour code (%s) made index', colourCode, index);
                    this._setColour(index);
                    draw = false;
                    break;

                case '+': // Right
                    dir += Number(this.settings.angle);
                    break;

                case '-': // Left
                    dir -= Number(this.settings.angle);
                    break;

                case '[': // Start a branch
                    states.push([dir, this.x, this.y, this.colour]);
                    draw = false;
                    break;

                case ']': // End a branch
                    const state = states.pop();
                    dir = state[0];
                    this.x = state[1];
                    this.y = state[2];
                    this.colour = state[3];
                    draw = true;
                    break;
            }

            this.logger.debug('SET DIR', dir);
            if (draw) {
                this._turtleGraph(dir, midiRenderer);
            }
        }
    }


    _turtleGraph(dir, midiRenderer) {
        this.ctx.beginPath();
        this.ctx.lineWidth = this.settings.lineWidth;

        this.logger.debug('Move dir (%s) from x (%s) y (%s)', dir, this.x, this.y);
        this.ctx.moveTo(this.x, this.y);

        this.x += (LsysRenderer.dcos(dir) * this.settings.turtleStepX);
        this.y += (LsysRenderer.dsin(dir) * this.settings.turtleStepY);

        if (!this.penUp) {
            const x = Math.round(this.x);
            const y = Math.round(this.y);
            this.logger.debug('DRAW LINE TO ', x, y);

            this.ctx.lineTo(x, y);
            this.ctx.closePath();
            this.ctx.stroke();

            midiRenderer.addNotes({
                startTick: this.x,
                duration: 1,
                pitchIndex: this.y
            });

            // midiRenderer.addNotesFromGraph({
            //     x: this.x,
            //     y: this.y
            // });
        }

        if (this.x < this.minX) { this.minX = this.x; }
        if (this.x > this.maxX) { this.maxX = this.x; }
        if (this.y < this.minY) { this.minY = this.y; }
        if (this.y > this.maxY) { this.maxY = this.y; }

        this.logger.silly('Moved to x (%s) y (%s)', this.x, this.y);
    }

    _setWidth(px) {
        this.ctx.lineWidth = px;
    }

    _hexAndOpacityToRgba(hex, opacity) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 'rgb(' +
            parseInt(result[1], 16) + ',' +
            parseInt(result[2], 16) + ',' +
            parseInt(result[3], 16) + ',' +
            opacity +
            ')' : null;
    }

    _setColour(colourIndex) {
        this.colour = this.preparedColours[colourIndex];
        this.logger.silly('Set colour to index (%d): ', colourIndex, this.colour, this.settings.colours);
        this.ctx.strokeStyle = this.colour;
    }


    resizeCanvas() {
        this.logger.debug('Resize Min: %d , %d\nMax: %d , %d', this.minX, this.minY, this.maxX, this.maxY);

        if (this.maxY < 0) {
            throw new RangeError('maxY out of bounds: ' + this.maxY);
        }
        if (this.maxX < 0) {
            throw new RangeError('maxX out of bounds: ' + this.maxX);
        }

        const wi = (this.minX < 0) ? Math.abs(this.minX) + Math.abs(this.maxX) : this.maxX - this.minX;
        const hi = (this.minY < 0) ? Math.abs(this.minY) + Math.abs(this.maxY) : this.maxY - this.minY;

        this._setUpCanvas();

        const sx = this.settings.canvasWidth / wi;
        const sy = this.settings.canvasHeight / hi;

        if (sx !== 0 && sy !== 0) {
            this.ctx.scale(sx, sy);
        }

        const newX = this.settings.initX - this.minX;
        const newY = this.settings.initY - this.minY;

        this.ctx.translate(newX, newY);

        this.logger.info('min/max X %d, %d -------> scale %d --> wi = %d', this.minX, this.maxX, sx, wi);
        this.logger.info('min/max Y %d, %d -------> scale %d --> hi = %d', this.minY, this.maxY, sy, hi);
        this.logger.info('Leave resize after scaling %d, %d to %d, %d', sx, sy, this.canvas.width, this.canvas.height);
    }

    finalise() {
        this.logger.verbose('Enter finalise');
        if (this.settings.finally && typeof this.settings.finally === 'function') {
            this.logger.verbose('Call finally');
            this.settings.finally.call(this);
        }
        this.logger.verbose('Leave finalise');
    }

};

module.exports = LsysRenderer;
