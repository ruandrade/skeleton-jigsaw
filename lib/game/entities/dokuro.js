ig.module('game.entities.dokuro')
.requires(
    'impact.entity',
    'game.entities.particle',
    'game.entities.fadegame'
)
.defines(function() {

    EntityDokuro = ig.Entity.extend({
        offset: {y:12, x:1},
        size: {y:20, x:14},
        zIndex: 1,

        maxVel: {x: 100, y: 200},
        friction: {x: 600, y: 0},

        type: ig.Entity.TYPE.A,
        checkAgainst: ig.Entity.TYPE.A,
        collides: ig.Entity.COLLIDES.PASSIVE,

        animSheet: new ig.AnimationSheet('media/dokuro.png', 16, 32),

        accelAir: 500,
        accelGround: 400,
        animating: false,
        falling: false,
        flip: false,
        jump: 150,
        jump_count: 0,

        shouldGetSword: 0,
        swordTimer: false,
        gotSword: false,
        glow: false,

        jump_sound: new ig.Sound( 'media/audio/jump.*' ),
        death_sound: new ig.Sound( 'media/audio/death.*' ),
        glow_sound: new ig.Sound( 'media/audio/glow.*' ),
        jumpfall_sound: new ig.Sound( 'media/audio/jumpfall.*' ),
        sword_sound: new ig.Sound( 'media/audio/sword.*' ),

        name: "dokuro",

        init: function(x, y, settings) {
            this.parent(x, y, settings);

            this.addAnim('idle', 1, [0, 1]);
            this.addAnim('run', 0.07, [4, 5, 6, 5, 4]);
            this.addAnim('jump', 1, [8]);
            this.addAnim('fall', 0.4, [9,10]);
            this.addAnim('getIn', 0.2, [12,13,14,13]);
            this.addAnim('glow', 0.4, [16,17,18]);
            this.addAnim('sword', 0.4, [20,21,22]);
        },

        update: function() {
            if(this.animating) {
                this.parent();
                return;
            }

            var accel = this.standing ? this.accelGround : this.accelAir;

            if (ig.input.state('left')) {
                this.accel.x = -accel;
                this.flip = true;
            } else if (ig.input.state('right')) {
                this.accel.x = accel;
                this.flip = false;
            } else {
                this.accel.x = 0;
            }

            // jump
            if ((this.standing || this.jump_count < 1) && ig.input.pressed('up')) {
                this.jump_sound.play();

                this.vel.y = -this.jump;
                this.jump_count++;

                // Jump bones causes a giant but on mobile safari
                if (!ig.ua.mobile && this.standing) {
                    BoneJumpSpawner(this, 2);
                }
            }

            if (this.standing) { this.jump_count = 0; }

            if (this.vel.y < 0) {
                this.currentAnim = this.anims.jump;

            } else if (this.vel.y > 0) {
                this.falling = true;
                this.currentAnim = this.anims.fall;

            } else if (this.vel.x !== 0) {
                this.currentAnim = this.anims.run;

            } else if (this.gotSword) {
                if (this.currentAnim != this.anims.sword) {
                    this.currentAnim = this.anims.sword;
                    this.sword_sound.play();

                    var jigsaw = ig.game.getEntitiesByType(
                        EntityJigsaw
                    )[0].setPost();

                    ig.game.setCredits();
                }

            } else if (this.glow) {
                if (this.swordTimer && this.swordTimer.delta() > 0) {
                    this.gotSword = true;
                } else {
                    if (!this.swordTimer) this.swordTimer = new ig.Timer(4);
                }

                if (this.currentAnim != this.anims.glow) {
                    this.currentAnim = this.anims.glow;
                    this.glow_sound.play();
                }

            } else {
                this.currentAnim = this.anims.idle;
            }

            if (this.vel.y === 0 && this.falling) {
                this.jumpfall_sound.play();
                this.falling = false;
            }

            this.currentAnim.flip.x = this.flip;
            this.parent();
        },

        kill: function() {
            ig.game.removeEntity( this );
            ig.game.spawnEntity( EntityDokuroHead, this.pos.x, this.pos.y-10, {flip:this.flip} );

            for(var i = 0; i < 5; i++) {
                ig.game.spawnEntity(EntityDokuroDeathBones, this.pos.x ,this.pos.y, {flip:this.flip});
            }
            this.death_sound.play();
        },

        getInAnimation: function() {
            if( !this.animating ) this.currentAnim = this.anims.getIn
            this.animating++;
        }
    });

    EntityDokuroHead = ig.Entity.extend({
        size: {x: 10, y: 8},
        gravityFactor: 0.5,
        bounciness: 0.4,

        type: ig.Entity.TYPE.B,
        checkAgainst: ig.Entity.TYPE.B,
        collides: ig.Entity.COLLIDES.PASSIVE,

        animSheet: new ig.AnimationSheet( 'media/dokuro-death.png', 10, 8 ),

        init: function( x, y, settings ) {
            this.parent( x, y, settings );
            this.addAnim( 'stay', 1, [0] );
            ig.game.setGameover(1);
        },

        update: function() {
            this.parent();
        }
    });

    EntityDokuroDeathBones = EntityParticle.extend({
        size: {x: 8, y: 8},
        vel: {x: 60, y: 70},
        gravityFactor: 0.3,
        bounciness: 1,
        fadetime: 0.1,
        lifetime: 1,
        animSheet: new ig.AnimationSheet('media/dokuro-death.png', 10, 8),
        init: function (x, y, settings) {
            this.addAnim('idle', 1, [Math.round(Math.random(1)*3)+1]);
            this.parent(x, y, settings);
        }
    });

    EntityBones = EntityParticle.extend({
        size: {x: 8, y: 8},
        vel: {x: 60, y: 70},
        gravityFactor: 0.3,
        fadetime: 0.1,
        lifetime: 1,
        type: ig.Entity.TYPE.B,
        collides: ig.Entity.COLLIDES.PASSIVE,

        animSheet: new ig.AnimationSheet( 'media/bones.png', 8, 8 ),

        init: function( x, y, settings ) {
            this.addAnim( 'stay', 2, [Math.round(Math.random(1)*4)] );
            this.parent( x, y, settings );
        },

        update: function() {
            this.parent();
        }
    });

    BoneJumpSpawner = function(th, quantity){
        var x = 0, y = 0;

        x = th.flip ? th.pos.x + th.size.x-8 : th.pos.x;
        y = th.pos.y + th.size.y-10;

        for(var i = 0; i < 2; i++) {
            ig.game.spawnEntity(EntityBones, x, y);
        }
    };
});
