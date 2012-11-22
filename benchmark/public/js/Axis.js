
// Axis Class

(function (PBDV, THREE, undefined) {

    "use strict";


    /**
     *  @class Axis
     *  @constructor
     */
    var Axis = function( size, titles, options ) {

        /* Poperties */
        
        /**
         *  Graph size
         *  @property size
         *  @type Object
         */
        this.size = size;

        /**
         *  Set of options that condition the axis
         *  @property options
         *  @type Object
         */
        this.options = options;

        /**
         *  Array of displayed messages
         *  @property texts
         *  @type Array
         */
        this.texts = [];

        /**
         *  Axis frame
         *  @property frame
         *  @type Object
         */
        this.frame = createFrame.call( this, titles );

        /**
         *  Divisions grid 
         *  @property grid
         *  @type Object
         */
        this.grid = createGrid.call(this);

        /**
         *  Full 3D axis object
         *  @property threeAxis
         *  @type Object
         */
        this.threeAxis = createAxis.call(this);

    };



    /* Private Methods */

    /**
     *  Axis creation method (consists on the addition of the different parts and a position change)
     *  @method createAxis
     *  @private
     */
    var createAxis = function() {
        // Creation of the Three.js Axis 3D Object
        var axis = new THREE.Object3D();
        
        // Setting Axis properties
        axis.add( this.frame );
        axis.add( this.grid );

        axis.position.x = -this.size.x/2;
        axis.position.y = -this.size.y/2;
        if (this.size.z >= 0) { axis.position.z = -this.size.z/2; }

        return axis;
        
    };


    /**
     *  Auxiliar method to reduce verbosity
     *  @method v
     *  @private
     */
    var v = function(x, y, z) {
        return new THREE.Vector3(x, y, z);
    };


    /**
     *  Frame creation method (can make 2D or 3D axis depending on the input size)
     *  @method createFrame
     *  @private
     */
    var createFrame = function( titles ) {
        var lineMat = new THREE.LineBasicMaterial({
            color     : 0x424242,
            linewidth : 2
        });

        var lineGeo = new THREE.Geometry();

        // If the size specified has just 2 components builds a 2D frame
        lineGeo.vertices.push(
            v(0,0,0),       v(this.size.x,0,0),
            v(0,0,0),       v(0,this.size.y,0),

            v(this.size.x,0,0), v(this.size.x,this.size.y,0),
            v(0,this.size.y,0), v(this.size.x,this.size.y,0)
            );

        // If the size specified has 3 components builds a 3D frame
        if (this.size.z >= 0) {
            lineGeo.vertices.push(
                v(0,0,0),                       v(0,0,this.size.z),
                v(this.size.x,0,0),             v(this.size.x,0,this.size.z),
                v(0,this.size.y,0),             v(0,this.size.y,this.size.z),
                v(this.size.x,this.size.y,0),   v(this.size.x,this.size.y,this.size.z),

                v(0,0,this.size.z),                     v(0,this.size.y,this.size.z),
                v(0,this.size.y,this.size.z),           v(this.size.x,this.size.y,this.size.z),
                v(this.size.x,this.size.y,this.size.z), v(this.size.x,0,this.size.z),
                v(this.size.x,0,this.size.z),           v(0,0,this.size.z)

            );
        }

        var frame = new THREE.Object3D();
        var line = new THREE.Line(lineGeo,lineMat);
        line.type = THREE.LinePieces;
        frame.add(line);

        setTitles.call( this, frame, titles );

        return frame;
    };


    /**
     *  Grid creation method (can make 2D or 3D axis depending on the input size)
     *  @method createGrid
     *  @private
     */
    var createGrid = function() {
        var grid = new THREE.Object3D();

        for (var coord in this.size) {
            if (this.size.hasOwnProperty(coord)){
                var part = setPart.call( this, coord );
                grid.add( part );
            }
        }

        return grid;
    };


    /**
     *  This method helps the createGrid metho to create each part of the grid.
     *  It's also used to update said parts when rescaling the graph.
     *  @method setPart
     *  @private
     *  @param coord {String}
     *  @param maxHeight {number}
     */
    var setPart = function ( coord, maxHeight ) {

        maxHeight = maxHeight || 10000;
        var MaxDiv = PBDV.Constants.Axis.MaxDiv;

        var divisions;

        var part = new THREE.Object3D();

        var lineMat = new THREE.LineBasicMaterial({
            color     : 0x808080,
            linewidth : 1
        });

        var lineGeo = new THREE.Geometry();
        
        var line = new THREE.Line(lineGeo,lineMat);
        line.type = THREE.LinePieces;

        var value, aux, d;

        var position = {
            x : 0,
            y : 0,
            z : 0
        };

        switch (coord) {

                case 'x' :  aux = this.options.queues;
                            d = (aux.end - aux.start)/aux.interval;
                            divisions = (d < MaxDiv.X) ? d : MaxDiv.X;
                            position.y = -this.size.y/50;
                            if (this.size.z >= 0) {position.z = this.size.z + this.size.z/50;}
                            part.name = 'gridX';
                            break;

                case 'y' :  aux = {start : 0, end : maxHeight};
                            divisions = MaxDiv.Y;
                            position.x = -this.size.x/50;
                            if (this.size.z >= 0) {position.z = this.size.z + this.size.z/50;}
                            part.name = 'gridY';
                            break;

                case 'z' :  aux = this.options.payload;
                            d = (aux.end - aux.start)/aux.interval;
                            divisions = (d < MaxDiv.Z) ? d : MaxDiv.Z;
                            position.x = this.size.x + this.size.x/50;
                            position.y = -this.size.y/50;
                            part.name = 'gridZ';
                            break;
            }

        var amount = this.size[coord] / divisions;
        amount = amount + 0.0000000000000005; //quickfix for precision
        amount = amount.toFixed(16); 
        amount = parseFloat(amount);

        if (divisions === 0) {amount = this.size[coord];}

        var a, b, c;
        for (var i = amount; i < this.size[coord]; i += amount) {

            switch (coord) {

                case 'x' :  a = v(i, 0, 0);
                            b = v(i, this.size.y, 0);
                            c = v(i, 0, this.size.z);
                            value = Math.round(aux.start + ((aux.end-aux.start)/divisions)*i/amount);
                            position.x = i;
                            break;

                case 'y' :  a = v(0, i, 0);
                            b = v(this.size.x, i, 0);
                            c = v(0, i, this.size.z);
                            value = Math.round((maxHeight/divisions)*i/amount);
                            position.y = i;
                            break;

                case 'z' :  a = v(0, 0, i);
                            b = v(this.size.x, 0, i);
                            c = v(0, this.size.y, i);
                            value = Math.round(aux.start + ((aux.end-aux.start)/divisions)*i/amount);
                            position.z = i;
                            break;
            }

            lineGeo.vertices.push(
                a,  b
            );
            // The code was first thought only for 3D, this part can use some improvement in performance
            if (this.size.z >= 0) {
                lineGeo.vertices.push(
                    a,  c
                );
            }

            setValue.call( this, value, position, line );
        }

        value = aux.start;
        position[coord] = 0;
        setValue.call( this, value, position, line );

        value = aux.end;
        position[coord] = this.size[coord];
        setValue.call( this, value, position, line );

        part.add( line );

        return part;

    };


    /**
     *  Method to put the axis titles
     *  @method setTitles
     *  @private
     *  @param frame {Object}
     *  @param titles {Object}
     */
    // TODO: merge with the setValue
    var setTitles = function( frame, titles ) {
        var titleX;
        titleX = PBDV.Utils.createText2D( titles.x );
        titleX.position.x = frame.position.x + this.size.x/2;
        titleX.position.y = frame.position.y - this.size.y/10;

        var titleY;
        titleY = PBDV.Utils.createText2D( titles.y );
        titleY.position.x = frame.position.x - this.size.x/10;
        titleY.position.y = frame.position.y + this.size.y/2;

        if (this.size.z >= 0) {
            titleX.position.z = frame.position.z + this.size.z + this.size.z/10;
            titleY.position.z = frame.position.z + this.size.z +  this.size.z/10;

            var titleZ;
            titleZ = PBDV.Utils.createText2D( titles.z );
            titleZ.position.x = frame.position.x + this.size.x + this.size.x/10;
            titleZ.position.y = frame.position.y -  this.size.y/10;
            titleZ.position.z = frame.position.z + this.size.z/2;
            
            this.texts.push(titleZ);
            frame.add(titleZ);
        }

        this.texts.push(titleX);
        frame.add(titleX);

        this.texts.push(titleY);
        frame.add(titleY);
    };


    /**
     *  Method to print and associate a value to an object in a given position
     *  @method setTitles
     *  @private
     *  @param value {number}
     *  @param position {Object}
     *  @param part {Object}
     */
    var setValue = function ( value, position, part ) {
        var text = PBDV.Utils.createText2D( value, 50 );
        text.position.x = position.x;
        text.position.y = position.y;
        text.position.z = position.z;
        this.texts.push(text);
        part.add(text);
    };


    /* Public API */

    Axis.prototype = {
    
        /**
         *  Method which performs the animation loop
         *  @method animate
         *  @param camera {Object}
         */ 
        animate : function ( camera ) {
            if (this.texts) {
                for (var i = 0; i < this.texts.length; i++) {
                    this.texts[i].lookAt(camera.position);
                    this.texts[i].rotation = camera.rotation;
                }
            }
        },


        /**
         *  This method rescales all the points of the plane according to a new Ratio
         *
         *  @method  rescale
         *  @param   maxHeight {number}
         */
        rescale : function ( maxHeight ) {
            this.grid.remove(this.grid.getChildByName('gridY', true));
            this.grid.add(setPart.call( this, 'y', maxHeight));
        }
    };


// Exported to the namespace
PBDV.Axis = Axis;


})( window.PBDV = window.PBDV || {},    // Namespace
THREE);                             // Dependencies
