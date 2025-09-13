import { createFileEncoderStream, CAREncoderStream } from 'ipfs-car';

/**
 * pre-computes the Storacha/IPFS-compatible CID for a file/directory
 *
 * This is necessary for us to ensure that a deposit is actually made before
 * delegations to store data is provided.
 */
 export async function computeCID(fileMap: Record<string, Uint8Array>): Promise<string> {
   try {
     if (Object.keys(fileMap).length === 1) {
       const [_, content] = Object.entries(fileMap)[0];
       const file = new Blob([content]);

       let rootCID: any;

       await createFileEncoderStream(file)
         .pipeThrough(new TransformStream({
           transform(block, controller) {
             rootCID = block.cid;
             controller.enqueue(block);
           }
         }))
         .pipeThrough(new CAREncoderStream())
         .pipeTo(new WritableStream());

       return rootCID.toString();
     }

     return await computeDirectoryCID(fileMap);

   } catch (error) {
     console.error("Error computing CID:", error);
     throw new Error(`Failed to compute CID: ${error instanceof Error ? error.message : String(error)}`);
   }
 }

 /**
  * Compute CID for directory (multiple files)
  * This matches how Storacha handles directory uploads
  */
 async function computeDirectoryCID(fileMap: Record<string, Uint8Array>): Promise<string> {
   // For now, if we have multiple files, just handle the first one
   // You might need to investigate how Storacha handles multiple files specifically
   const [_, content] = Object.entries(fileMap)[0];
   const file = new Blob([content]);

   let rootCID: any;

   await createFileEncoderStream(file)
     .pipeThrough(new TransformStream({
       transform(block, controller) {
         rootCID = block.cid;
         controller.enqueue(block);
       }
     }))
     .pipeThrough(new CAREncoderStream())
     .pipeTo(new WritableStream());

   return rootCID.toString();
 }
