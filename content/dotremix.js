async function getWasmExec(remixFileContent, appName) {
    const zip = new JSZip();
    const remixFile = await zip.loadAsync(remixFileContent);

    const manifestFile = await remixFile.file("manifest.json");
    if (!manifestFile) {
        throw Error("manifest file not found");
    }

    const manifestJson = await manifestFile.async("string");
    const manifest = JSON.parse(manifestJson);

    if (!appName) {
        const apps = Object.keys(manifest.apps);
        if (apps.length === 0) {
            throw Error("there are no apps in the .remix file");
        } else if (apps.length !== 1) {
            throw Error(
                "there are multiple apps in the .remix file, please specify which one explicitly"
            );
        }
        appName = apps[0];
    } else if (!(appName in manifest.apps)) {
        throw Error(
            `"${appName}" does not exist in the .remix file`
        );
    }

    const filename = `apps/${appName}/libraries/executable_cross.WASM`;
    const wasmFile = await remixFile.file(filename);
    if (!wasmFile) {
        throw Error(`${filename} not found inside remix file`);
    }

    const runtimeJsonFileName = `apps/${appName}/runtime.json`;
    let runtimeJson = null;
    try {
        runtimeJson = await remixFile.file(runtimeJsonFileName).async("string");
    } catch (e) {
        // no runtime.json... no problem
    }

    const wasmBlob = await wasmFile.async("base64");
    return {
        url: `data:application/wasm;base64,${wasmBlob}`,
        app: appName,
        runtimeJson,
    };
}

async function getWasmDataUrlFromRemixFile(url, appName) {
    const res = await fetch(url);
    if (!res.ok) {
        throw Error("unable to fetch ${url}");
    }
    let fileData = await res.blob();
    return await getWasmExec(fileData, appName);
}
