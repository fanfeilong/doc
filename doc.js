let fs = require("fs-extra");
let path = require("path");
let child_process = require('child_process');

let rootDir = __dirname;

class Util{
    static execCmd(cmd, workspace) {
        let pwd = workspace;
        try{
            child_process.execSync(cmd, {stdio: 'inherit', cwd: pwd});
        }catch(e){
            console.error('run cmd failed:',cmd);
            process.exit(1);
        }
    }

    static execCmdAsync(cmd, workspace) {
        let pwd = workspace;
        try{
            child_process.exec(cmd, {stdio: 'inherit', cwd: pwd});
        }catch(e){
            console.error('run cmd failed:',cmd);
            process.exit(1);
        }
    }

    static getBuckyOSVersion(){
        try{
            let v = child_process.execSync('npm view buckyos version');
            return v.toString().trim();
        }catch(e){
            console.error('run cmd failed:','npm view buckyos version');
            process.exit(1);
        }
    }

    static _requireGlobal(packageName) {
      var childProcess = require('child_process');
      var path = require('path');
      var fs = require('fs');

      var globalNodeModules = childProcess.execSync('npm root -g').toString().trim();
      var packageDir = path.join(globalNodeModules, packageName);
      if (!fs.existsSync(packageDir))
        packageDir = path.join(globalNodeModules, 'npm/node_modules', packageName); //find package required by old npm

      if (!fs.existsSync(packageDir))
        throw new Error('Cannot find global module \'' + packageName + '\'');

      var packageMeta = path.join(packageDir, 'package.json');

      return require(packageMeta);
    }

    static _requireLocal(packageName){
        var packageMeta = path.join(packageName, 'package.json');
        return require(packageMeta);
    }

    static isNodePackageExistGlobal(packageName){
        try{
            Util._requireGlobal(packageName);
            return true;
        }catch(e){
            return false;
        }
    }

    static isNodePackageExistLocal(packageName){
        try{
            Util._requireLocal(packageName);
            return true;
        }catch(e){
            return false;
        }
    }

    static isNodePackageExist(packageName){
        try{
            Util._requireLocal(packageName);
            return true;
        }catch(e){
            try{
                Util._requireGlobal(packageName);
                return true;
            }catch(e){
                return false;
            }
        }
    }

    static getNodePackageVersion(packageName){
        let v = '0.0.0';
        try {
            v = Util._requireLocal(packageName).version;
        } catch (e) {
            try{
                v = Util._requireGlobal(packageName).version;
            }catch(e){

            }
        }

        return v;
    }

    static cloneDirFromGit(gitHost,subDir){
        const gitName = path.basename(gitHost,'.git');
        const gitDir = path.join(rootDir,gitName);

        const srcDir = path.join(rootDir,`${gitName}/${subDir}`);
        const destDir = path.join(rootDir,subDir);
        
        Util.execCmd(`git clone ${gitHost}`,rootDir);
        
        fs.copySync(srcDir, destDir);

        fs.removeSync(gitDir);

        return destDir;
    }

    static genGitbook(srcDir,destDir){
        const srcBookDir = path.join(srcDir,'_book');
        const destBookDir = path.join(rootDir,destDir);
        Util.execCmd('gitbook init',srcDir);
        Util.execCmd('gitbook build',srcDir);
        fs.copySync(srcBookDir,destBookDir);

        const readmeSrc = path.join(srcDir,'README.md');
        const readmeDest = path.join(destBookDir,'README.md');
        fs.copySync(readmeSrc,readmeDest);
        fs.removeSync(srcDir);

        Util.execCmdAsync('gitbook serve',destBookDir);

        const index = path.join(destBookDir,'index.html');
        Util.open(index);
    }

    static copyTo(srcDir,destDir){
        const srcBookDir = path.join(rootDir,srcDir);
        const destBookDir = path.join(rootDir,destDir);
        
        fs.removeSync(destBookDir);

        console.log(`copy from ${srcBookDir} to ${destBookDir}`);
        fs.copySync(srcBookDir,destBookDir);
        return destBookDir;
    }

    static open(filePath) {
        let getCommandLine = () => {
            switch (process.platform) {
                case 'darwin':
                    return 'open';
                case 'win32':
                    return 'start';
                case 'win64':
                    return 'start';
                default:
                    return 'xdg-open';
            }
        };
        var exec = require('child_process').exec;
        Util.execCmd(getCommandLine() + ' ' + filePath);
    }
}

function main(){
    // check gitbook-cli
    if(!Util.isNodePackageExistGlobal('gitbook-cli')){
        console.log('->install gitbook-cli...');
        Util.execCmd('npm install -g gitbook-cli',rootDir);
    }else{
        console.log('gitbook is already exist');
    }

    // copy doc
    const docDir = Util.copyTo(process.argv[2],'docs-temp');

    // gen gitbook
    Util.genGitbook(docDir,process.argv[3]);
}

main();

