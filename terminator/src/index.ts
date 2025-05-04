// examples/pdf-to-form/src/index.ts
process.on('uncaughtException', (error, origin) => {
    console.error('<<<<< UNCAUGHT EXCEPTION >>>>>');
    console.error(error);
    console.error('Origin:', origin);
    process.exit(1); // Exit on uncaught exception
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('<<<<< UNHANDLED REJECTION >>>>>');
    console.error('Reason:', reason);
    // console.error('Promise:', promise); // Can be verbose, uncomment if needed
});

import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { tool, streamText, CoreMessage } from 'ai';
import { z } from 'zod';
import { DesktopUseClient, ApiError } from 'desktop-use';

// Suppress Node.js warnings
// process.removeAllListeners('warning'); // Removing this might show useful warnings

dotenv.config();

const ENV_PATH = path.resolve(__dirname, '../.env');
const PDF_FILE_PATH = path.resolve(__dirname, '../data.pdf');
// Ensure this URL is exactly what appears in the Edge App window title or accessible properties
const WEB_APP_URL = 'https://v0-pharmaceutical-form-design-5aeik3.vercel.app/';
// Ensure this path is correct for your system
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

// Create readline interface for more reliable terminal input
const rl:any = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Promise-based readline question function
function question(query: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // Add a check to ensure rl is not closed
        if (rl.closed) {
            return reject(new Error("Readline interface closed unexpectedly."));
        }
        try {
            rl.question(query, (answer:any) => {
                resolve(answer);
            });
        } catch (error) {
            reject(error);
        }
    });
}

async function getApiKey(): Promise<string> {
    let apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.log("Gemini API Key not found in environment variables (.env).");
        // Use await here as question returns a Promise
        const input = await question("Please enter your Gemini API Key: ");
        apiKey = input.trim();

        if (!apiKey) {
            // rl.close(); // Close readline before throwing error/exiting
            throw new Error("API Key cannot be empty.");
        }

        // Save the API key to .env
        try {
            await fs.appendFile(ENV_PATH, `\nGEMINI_API_KEY=${apiKey}`);
            console.log("API Key saved to .env file.");
            // Reload .env variables after appending
            dotenv.config({ path: ENV_PATH, override: true });
            // Re-assign apiKey from the potentially newly loaded env var
            apiKey = process.env.GEMINI_API_KEY!; // Use non-null assertion as we expect it now
        } catch (err) {
            console.error("Error saving API key to .env:", err);
            console.warn("Proceeding without saving API key.");
            // Ensure apiKey still holds the user input if saving failed
            if (!process.env.GEMINI_API_KEY) {
                 process.env.GEMINI_API_KEY = apiKey; // Set it in the current process env
            } else {
                 apiKey = process.env.GEMINI_API_KEY; // Use the one from .env if somehow loaded
            }

        }
    }
     // Final check after potential saving/loading
     if (!apiKey) {
        // rl.close(); // Ensure readline is closed before exiting
        throw new Error("API Key is missing after attempting to retrieve or save.");
    }


    return apiKey;
}

async function main() {
    console.log(`\n✨ Welcome to the AI PDF-to-Form Automator! ✨`);

    const apiKey = await getApiKey();
    console.log("🔑 Gemini API Key loaded.");

    const google = createGoogleGenerativeAI({
        apiKey: apiKey,
    });
    // Consider using a more advanced model if 'flash' struggles with complex instructions
    // const model = google('models/gemini-1.5-pro-latest');
    const model = google('models/gemini-1.5-flash-latest'); // Use latest flash model
    console.log(`🤖 Initialized Gemini Model: ${model.modelId}`);

    let desktopClient: DesktopUseClient | any = null;
    try {
        desktopClient = new DesktopUseClient();
        console.log("🖥️ Connected to Terminator server.");
    } catch (error) {
        console.error("❌ Failed to connect to Terminator server.");
        if (error instanceof Error) {
            console.error(`   Details: ${error.message}`);
            if (error instanceof ApiError) {
                console.error(`   Status: ${error.status}`);
            }
        } else {
            console.error(error);
        }
        rl.close();
        process.exit(1);
    }

    // --- Manual Setup ---
    console.log(`\n--- Manual Setup Required ---`);
    console.log(`Please ensure the Terminator server is running.`);
    console.log(`We will attempt to open the windows for you.`);

    try {
        console.log(`Attempting to open PDF: ${PDF_FILE_PATH}`);
        await desktopClient.exec(`start "" "${EDGE_PATH}" --new-window "${PDF_FILE_PATH}"`);
        console.log(`Attempting to open Web App: ${WEB_APP_URL}`);
        await desktopClient.exec(`start "" "${EDGE_PATH}" --app="${WEB_APP_URL}"`);
        console.log("✅ Windows opened (hopefully!). Please arrange them now.");
        console.log("   Arrange the PDF window on the LEFT.");
        console.log("   Arrange the Web App window on the RIGHT.");
        await new Promise(resolve => setTimeout(resolve, 3000)); // Give user time
    } catch (error) {
        console.error("❌ Failed to automatically open windows.", error);
        console.log(`Please open them manually if they didn't appear:`);
        const pdfCmd = `Start-Process -FilePath '${EDGE_PATH}' -ArgumentList '--new-window \"${PDF_FILE_PATH}\"'`;
        const appCmd = `Start-Process -FilePath '${EDGE_PATH}' -ArgumentList '--app=${WEB_APP_URL}'`;
        console.log(`\n# 1. Open PDF in Edge:\n${pdfCmd}\n`);
        console.log(`# 2. Open Web App in Edge:\n${appCmd}\n`);
        console.log(`Then, arrange the PDF window on the LEFT and the Web App window on the RIGHT.`);
    }


    const answer = await question("Are the PDF (left) and Form App (right) windows open side-by-side and ready? (y/n): ");
    const processedAnswer = answer.trim().toLowerCase();

    if (processedAnswer !== 'y' && processedAnswer !== 'yes') {
        console.log("Setup not confirmed. Exiting.");
        rl.close();
        process.exit(0);
    }

    console.log("✅ Setup confirmed by user. Sleeping 2 seconds...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`\n🧠 AI starting PDF-to-Form process...`);

    // Define Tools for AI
    const tools = {
        findElement: tool({
            description: `Finds a specific UI element based on a selector string within a specific window context if provided. Returns element details including its ID, role, and name/label which can be used in other tools. Use this BEFORE trying to read or type if you are unsure of the exact selector.`,
            parameters: z.object({
                selector: z.string().describe(`The selector string for the UI element (e.g., '#WINDOW_ID role:edit name:"First Name"', 'name:"Submit Button"'). Include #WINDOW_ID prefix if targeting within a specific window found via findWindow.`),
                windowId: z.string().optional().describe("Optional: The specific window ID (e.g., '#window123') to search within. If omitted, searches across accessible windows, which is less reliable."),
            }),
            execute: async ({ selector, windowId }) => {
                const finalSelector = windowId ? `${windowId} ${selector}` : selector;
                console.log(`\n🔧 [Tool Call] Finding element: "${finalSelector}"`);
                try {
                    // Use locator with first() to get details of the first match
                    const element = await desktopClient!.locator(finalSelector).first().timeout(10); // Add timeout
                    console.log(`\n✅ [Tool Result] Found element: Role=${element.role}, Name=${element.label}, ID=${element.id}`);
                    // Return useful details for the AI
                    return { success: true, elementId: element.id, role: element.role, name: element.label, selectorUsed: finalSelector };
                } catch (error: any) {
                    console.error(`\n❌ [Tool Error] Failed to find element with selector "${finalSelector}": ${error.message}`);
                    return { success: false, error: `Failed findElement for selector "${finalSelector}": ${error.message}` };
                }
            }
        }),
         readElementText: tool({
            description: `Reads the text content from a UI element specified by a selector string. CRITICAL: Provide the specific window ID prefix in the selector (e.g., '#PDF_WINDOW_ID role:document') to read from the correct window.`,
            parameters: z.object({
                selector: z.string().describe(`The selector string for the UI element to read text from. MUST include window ID prefix if applicable (e.g., '#window123 role:document').`)
            }),
            execute: async ({ selector }) => {
                console.log(`\n🔧 [Tool Call] Reading text from element: "${selector}"`);
                try {
                    const result = await desktopClient!.locator(selector).getText(10); // 10 second timeout
                    console.log(`\n✅ [Tool Result] Got text (length ${result.text.length}). Snippet: "${result.text.substring(0, 150)}..."`);
                    return { success: true, text: result.text };
                } catch (error: any) {
                    console.error(`\n❌ [Tool Error] Failed to get text from element "${selector}": ${error.message}`);
                    return { success: false, error: `Failed readElementText for selector "${selector}": ${error.message}` };
                }
            }
        }),
        typeIntoElement: tool({
            description: `Types the given text into the UI element identified by the selector string. CRITICAL: Provide the specific window ID prefix in the selector (e.g., '#FORM_WINDOW_ID name:"First Name"') to type into the correct window and field.`,
            parameters: z.object({
                selector: z.string().describe(`The selector string for the UI element to type into. MUST include window ID prefix (e.g., '#window456 role:edit name:"First Name"').`),
                textToType: z.string().describe("The text to type into the element."),
            }),
            execute: async ({ selector, textToType }) => {
                // Log the attempt clearly
                console.log(`\n🔧 [Tool Call] Typing "${textToType.substring(0, 50)}${textToType.length > 50 ? '...' : ''}" into element: "${selector}"`);
                try {
                    const element = desktopClient!.locator(selector);
                    // Optional: Add a short delay before typing, might help sometimes
                    // await new Promise(resolve => setTimeout(resolve, 200));
                    const result = await element.typeText(textToType, { timeout: 15 }); // Increased timeout slightly for typing
                    console.log(`\n✅ [Tool Result] Typed text into "${selector}".`);
                    return { success: true, details: result };
                } catch (error: any) {
                    console.error(`\n❌ [Tool Error] Failed to type into element "${selector}": ${error.message}`);
                    // Provide more context in the error message back to the AI
                    return { success: false, error: `Failed typeIntoElement for selector "${selector}": ${error.message}. Check if the selector is correct and the element is visible/enabled within the correct window.` };
                }
            }
        }),
        findWindow: tool({
            description: `Finds a top-level application window based on criteria like title. Returns the window element including its ID, which MUST be used as a prefix in subsequent selectors (e.g., '#FOUND_WINDOW_ID role:document').`,
            parameters: z.object({
                titleContains: z.string().optional().describe("A substring of the window title to search for (case-insensitive). E.g., 'data.pdf' or 'v0 App'. Be specific."),
                // className: z.string().optional().describe("Window class name (advanced)."),
                // controlType: z.string().optional().describe("Window control type (advanced, e.g., 'Window')."),
            }),
            execute: async ({ titleContains/*, className, controlType*/ }) => {
                if (!titleContains /*&& !className && !controlType*/) {
                    return { success: false, error: "findWindow requires at least one property like 'titleContains'." };
                }
                const criteria = { titleContains/*, className, controlType*/ };
                console.log(`\n🔧 [Tool Call] Finding window with criteria: ${JSON.stringify(criteria)}`);
                try {
                    // Find the window locator
                    const windowLocator = await desktopClient!.findWindow(criteria);
                    // Get the first matching window element details
                    const windowElement = await windowLocator.first(10); // Added timeout
                    const windowId = windowElement.id; // Extract the ID specifically
                    console.log(`\n✅ [Tool Result] Found window: Name="${windowElement.label}", ID="${windowId}", Role=${windowElement.role}`);
                    // Return the ID prominently for the AI to use
                    return { success: true, windowId: windowId, windowName: windowElement.label, windowRole: windowElement.role };
                } catch (error: any) {
                    console.error(`\n❌ [Tool Error] Failed to find window (${JSON.stringify(criteria)}): ${error.message}`);
                    return { success: false, error: `Failed findWindow (${JSON.stringify(criteria)}): ${error.message}. Check if a window matching the criteria is open and visible.` };
                }
            }
        }),
        finishTask: tool({
            description: "Call this tool ONLY when ALL data has been successfully transferred from the PDF to the form.",
            parameters: z.object({
                summary: z.string().describe("A brief summary of the data transferred and the completion status."),
            }),
            execute: async ({ summary }) => {
                console.log(`\n🏁 [Tool Call] Finishing Task: ${summary}`);
                console.log(`\n🎉 Automation task marked as complete by AI.`);
                // We can potentially add a flag here to stop further processing if needed
                return { success: true, message: "Task finished successfully.", summary: summary };
            },
        }),
    };

    // Construct Prompt for AI - **CRITICAL CHANGES HERE**
    const systemPrompt = `You are an AI assistant specialized in automating data entry from a PDF document into a web application form using the 'desktop-use' SDK via provided tools.

    **Setup:**
    The user has opened the PDF ('data.pdf' in Edge) and the web application form ('v0 App' or similar title in Edge) side-by-side (PDF left, form right) and confirmed readiness.

    **Your Goal - Follow This Order Strictly:**
    1.  **Identify Windows:**
        *   Use **'findWindow'** with \`titleContains:"data.pdf"\` to find the PDF viewer window. Store its 'windowId' (e.g., \`#pdfWindowId\`).
        *   Use **'findWindow'** with \`titleContains:"v0 App"\` (or the most specific title part of the form app) to find the Web Form window. Store its 'windowId' (e.g., \`#formWindowId\`).
        *   **CRITICAL:** If 'findWindow' fails, report the error clearly and stop. Do not proceed without window IDs.
    2.  **Read PDF Text:**
        *   Use the **'readElementText'** tool.
        *   **CRITICAL:** Construct the selector by **prefixing** it with the PDF window ID found in step 1. Use a specific role like 'document' or 'pane' within that window. Example selector: \`"#pdfWindowId role:document"\`. **Do NOT use a generic selector without the window ID prefix.**
    3.  **Fill Form Fields:**
        *   For each piece of data extracted from the PDF:
        *   Use the **'typeIntoElement'** tool.
        *   **CRITICAL:** Construct the selector by **prefixing** it with the FORM window ID found in step 1 (e.g., \`#formWindowId\`).
        *   Use specific identifiers for the form field, preferably \`name:"Exact Field Name"\` (like "First Name", "Patient ID") or \`role:edit\` potentially combined with a name or adjacent text if a direct name match fails. Example selectors: \`"#formWindowId name:'First Name'"\`, \`"#formWindowId role:edit name:'Patient ID'"\`.
        *   **If typing fails:** The selector might be wrong. Try using 'findElement' first with the same window-scoped selector to verify the element exists and check its reported name/role before retrying 'typeIntoElement'.
        *   Accurately transfer the corresponding text read from the PDF. Do not hallucinate data.
    4.  **Complete Task:**
        *   Once *all* relevant data is accurately transferred *and verified* (e.g., no tool errors during typing), call **'finishTask'** with a summary.

    **Tool Usage Guidelines:**
    - **Window Scoping is MANDATORY:** Always prefix selectors for 'readElementText' and 'typeIntoElement' with the correct '#windowId' obtained from 'findWindow'. This is the most common failure point.
    - **Selector Specificity:** Prefer \"name:'Exact Name'\" or specific IDs if available. Use \"role:\" (e.g., \"edit\", \"button\", \"document\") as needed. Check tool results for correct element details.
    - **Error Handling:** If a tool returns \"success: 'false'\", analyze the error message. Do not blindly retry the same failing command. Adjust the selector or strategy (e.g., use 'findElement' to debug).
    // - **Be Precise:** Use the exact windowId string returned by findWindow, including the leading '#'.

    **Start now by using 'findWindow' twice as described in Step 1.**`;


    const initialUserMessage = "The PDF and Form windows are open side-by-side and confirmed ready. Please start the automation process strictly following the system prompt: 1. Find both windows (PDF and Form). 2. Read text from the PDF window using its ID. 3. Fill the form fields using the Form window's ID and specific field selectors. 4. Finish when done.";

    const messages: CoreMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: initialUserMessage }
    ];

    // Generate and Stream AI Actions
    try {
        console.log("DEBUG: Calling streamText with tools and messages...");
        const { textStream, toolResults, finishReason, usage } = await streamText({
            model: model,
            tools: tools,
            messages: messages,
            // toolChoice: 'auto', // Allow AI to decide if tools are needed or if it should just talk
            maxToolRoundtrips: 15, // Limit rounds to prevent infinite loops
            // maxSteps is deprecated, use maxToolRoundtrips
            onToolCall: ({ toolCall }:any) => {
                 console.log(`\n🤖 AI wants to call tool: ${toolCall.toolName} with args: ${JSON.stringify(toolCall.args)}`);
             },
             onToolResult: ({ toolResult }:any) => {
                 console.log(`\n Tool Result for ${toolResult.toolName}: ${JSON.stringify(toolResult.result).substring(0, 200)}...`);
             },
            // onError is deprecated in newer ai sdk versions, handle errors in the main try/catch
        });

        // Stream the AI's thinking process and text responses
        let fullResponse = "";
        let thinking = "";
        process.stdout.write(`\nAI Processing:\n---\n`);
        for await (const delta of textStream) {
             // Check delta type if needed (e.g., distinguish text from tool calls if not using onToolCall)
            process.stdout.write(delta);
            fullResponse += delta;
            thinking += delta; // Capture AI thought process between tool calls

            // Optional: Log thinking chunks periodically or when a tool is about to be called
            if (thinking.length > 100) { // Example threshold
               // console.log(`\n[AI thought chunk]:\n${thinking}\n---`);
               thinking = ""; // Reset chunk
            }
        }
         process.stdout.write(`\n---\n`);
         if(thinking.trim()){ // Log any remaining thought process
             //console.log(`\n[AI final thoughts]:\n${thinking}\n---`);
         }


        // Optional: Process tool results if needed outside the stream loop
        // (though usually handled by the AI in subsequent turns)
        // const finalToolResults = await toolResults;
        // console.log("\nFinal Tool Results:", JSON.stringify(finalToolResults, null, 2));

        console.log(`\n✅ AI interaction finished. Reason: ${finishReason}`);
        console.log(`📊 Token Usage: ${JSON.stringify(usage)}`);

    } catch (error:any) {
        console.error(`\n❌ An error occurred during the main AI interaction loop:`);
        // Check for specific API errors if applicable
         if (error instanceof ApiError) {
            console.error(`   API Error Status: ${error.status}`);
            console.error(`   API Error Details: ${JSON.stringify(error.body)}`);
        } else if (error instanceof Error) {
             console.error(`   Error Message: ${error.message}`);
             console.error(`   Stack: ${error.stack}`);
        } else {
             console.error(error);
        }
    } finally {
        rl.close(); // Ensure readline is closed on exit or error
        console.log(`\n👋 AI Automator session finished.`);
        // Ensure process exits cleanly, especially if background tasks are running
        process.exit(0); // Use 0 for normal exit, 1 for error exit already handled
    }
}

main().catch(error => {
    console.error("\n💥 Unhandled error in main execution:", error);
     if (!rl.closed) {
         rl.close();
     }
    process.exit(1); // Exit with error code
});