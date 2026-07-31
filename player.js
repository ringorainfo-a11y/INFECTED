import * as THREE from "three";

export class Player {

    constructor(camera, scene){

        this.camera = camera;
        this.scene = scene;

        this.height = 1.8;

        this.walkSpeed = 6;
        this.runSpeed = 11;

        this.velocity = new THREE.Vector3();

        this.keys = {};

        this.pitch = 0;
        this.yaw = 0;

        this.pointerLocked = false;

        this.player = new THREE.Object3D();
        this.player.position.set(0, this.height, 0);

        scene.add(this.player);

        this.player.add(camera);

        camera.position.set(0,0,0);

        this.initControls();

    }

    initControls(){

        document.addEventListener("keydown",(e)=>{
            this.keys[e.code]=true;
        });

        document.addEventListener("keyup",(e)=>{
            this.keys[e.code]=false;
        });

        document.addEventListener("click",()=>{

            if(!this.pointerLocked){

                document.body.requestPointerLock();

            }

        });

        document.addEventListener("pointerlockchange",()=>{

            this.pointerLocked =
                document.pointerLockElement===document.body;

        });

    }

}
