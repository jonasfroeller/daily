import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./components/SignInForm";
import { SignOutButton } from "./components/SignOutButton";
import { Toaster } from "sonner";
import { useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import { DocumentEditor } from "./components/DocumentEditor";
import { 
  MDXEditor, 
  headingsPlugin, 
  listsPlugin,
  quotePlugin, 
  markdownShortcutPlugin, 
  toolbarPlugin, 
  UndoRedo, 
  BoldItalicUnderlineToggles,
  BlockTypeSelect, 
  ListsToggle, 
  CreateLink,
  InsertThematicBreak,
  InsertCodeBlock,
  InsertTable,
  CodeToggle,
  tablePlugin,
  thematicBreakPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  linkPlugin,
  linkDialogPlugin,
  Separator,
  frontmatterPlugin,
  directivesPlugin,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { Tldraw, track, useEditor } from 'tldraw';
import 'tldraw/tldraw.css';
import React from 'react';

const TailwindSpinner = () => (
  <div className="flex justify-center items-center">
    <div className="w-12 h-12 rounded-full border-t-2 border-b-2 border-blue-500 animate-spin"></div>
  </div>
);

const SafeTldraw = ({ children }: { children: React.ReactNode }) => {
  React.useEffect(() => {
    const originalBeforeUnload = window.onbeforeunload;
    
    // Override the beforeunload event to prevent warnings
    window.onbeforeunload = null;
    
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(
      type: string, 
      listener: EventListenerOrEventListenerObject, 
      options?: boolean | AddEventListenerOptions
    ) {
      if (type === 'beforeunload') {
        return;
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    return () => {
      window.onbeforeunload = originalBeforeUnload;
      window.addEventListener = originalAddEventListener;
    };
  }, []);
  
  return <>{children}</>;
};

const DrawingEditor = track(({ todoId, drawingData }: { todoId: Id<"todos">, drawingData?: string }) => {
  const editor = useEditor();
  const updateDrawing = useMutation(api.todos.updateDrawing);
  const debounceTimerRef = React.useRef<number | null>(null);
  const initialLoadRef = React.useRef(false);
  const snapshotRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (editor && drawingData && !initialLoadRef.current) {
      try {
        console.log('Loading drawing data');
        const snapshot = JSON.parse(drawingData);
        editor.store.loadSnapshot(snapshot);
        initialLoadRef.current = true;
      } catch (error) {
        console.error('Failed to load drawing:', error);
      }
    }
  }, [editor, drawingData]);

  const saveDrawing = React.useCallback(() => {
    if (!editor) return;
    
    try {
      const snapshot = JSON.stringify(editor.store.getSnapshot());
      
      if (snapshot !== snapshotRef.current) {
        console.log('Saving drawing', todoId);
        updateDrawing({ 
          id: todoId,
          drawing: snapshot
        });
        snapshotRef.current = snapshot;
      }
    } catch (error) {
      console.error('Failed to save drawing:', error);
    }
  }, [editor, todoId, updateDrawing]);

  React.useEffect(() => {
    if (!editor) return;
    
    const handleChange = () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = window.setTimeout(() => {
        saveDrawing();
        debounceTimerRef.current = null;
      }, 300);
    };
    
    const handleBlur = () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      saveDrawing();
    };
    
    editor.on('change', handleChange);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      editor.off('change', handleChange);
      window.removeEventListener('blur', handleBlur);
      
      saveDrawing();
      
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [editor, saveDrawing]);

  React.useEffect(() => {
    if (!editor) return;
    
    const intervalId = window.setInterval(() => {
      saveDrawing();
    }, 3000);
    
    return () => {
      window.clearInterval(intervalId);
    };
  }, [editor, saveDrawing]);

  return null;
});

function App() {
  const [activeTab, setActiveTab] = useState<'todos' | 'documents'>('todos');
  const todos = useQuery(api.todos.list);

  const isLoading = activeTab === 'todos' && todos === undefined;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex sticky top-0 z-10 justify-between items-center p-4 border-b backdrop-blur-sm bg-white/80">
        <h2 className="text-xl font-semibold accent-text">Daily App</h2>
        <Authenticated>
          <div className="flex gap-4 items-center">
            <button 
              onClick={() => setActiveTab('todos')}
              className={`px-4 py-2 rounded ${activeTab === 'todos' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Tasks
            </button>
            <button 
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 rounded ${activeTab === 'documents' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Documents
            </button>
            <SignOutButton />
          </div>
        </Authenticated>
      </header>
      <main className={`flex flex-1 justify-center items-center ${activeTab === 'todos' ? 'p-8' : 'p-4'}`}>
        <div className={`mx-auto w-full h-full ${activeTab === 'todos' ? 'max-w-3xl' : ''}`}>
          <Authenticated>
            {activeTab === 'documents' && <AuthenticatedDocumentContent />}
            {activeTab === 'todos' && (
              isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <TailwindSpinner />
                </div>
              ) : (
                <TodoContent todos={todos!} />
              )
            )}
          </Authenticated>
          <Unauthenticated>
            <SignInForm />
          </Unauthenticated>
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function AuthenticatedDocumentContent() {
  const documents = useQuery(api.documents.list);
  const isLoadingDocuments = documents === undefined;

  if (isLoadingDocuments) {
    return (
      <div className="flex justify-center items-center h-full">
        <TailwindSpinner />
      </div>
    );
  }
  return <DocumentContent documents={documents!} />;
}

function DocumentContent({ documents: initialDocuments }: { documents: NonNullable<ReturnType<typeof useQuery<typeof api.documents.list>>> }) {
  const documents = initialDocuments;
  const createDocument = useMutation(api.documents.create);
  const deleteDocument = useMutation(api.documents.remove);
  const [selectedDocumentId, setSelectedDocumentId] = useState<Id<"documents"> | null>(null);

  const handleCreateDocument = async () => {
    const documentId = await createDocument();
    setSelectedDocumentId(documentId);
  };

  if (selectedDocumentId) {
    return (
      <div className="overflow-hidden h-full">
        <div className="h-[calc(100%-40px)]">
          <DocumentEditor 
            documentId={selectedDocumentId} 
            onBack={() => setSelectedDocumentId(null)} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 mx-auto max-w-4xl">
      <div>
        <h1 className="mb-4 text-3xl font-bold text-center accent-text">My Documents</h1>
        <div className="flex justify-center mb-6">
          <button
            onClick={handleCreateDocument}
            className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            New Document
          </button>
        </div>
        {documents.length === 0 ? (
          <div className="p-8 text-center text-gray-500 rounded-lg border">
            <p>You don't have any documents yet. Create your first document!</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {documents.map((document) => (
              <li
                key={document._id}
                className="overflow-hidden rounded-lg border transition-shadow duration-200 hover:shadow-md"
              >
                <button
                  onClick={() => setSelectedDocumentId(document._id)}
                  className="flex flex-col w-full h-full text-left"
                >
                  <div className="p-4 bg-white">
                    <h3 className="text-lg font-semibold">{document.title}</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {new Date(document.updatedAt).toLocaleDateString()} • 
                      {document.content?.length 
                        ? ` ${document.content.split(' ').length} words` 
                        : ' Empty document'}
                    </p>
                  </div>
                </button>
                <div className="flex justify-end p-2 bg-gray-50 border-t">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (confirm('Are you sure you want to delete this document?')) {
                        deleteDocument({ id: document._id });
                      }
                    }}
                    className="px-2 py-1 text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TodoContent({ todos: initialTodos }: { todos: NonNullable<ReturnType<typeof useQuery<typeof api.todos.list>>> }) {
  const todos = useQuery(api.todos.list) ?? initialTodos;
  const addTodo = useMutation(api.todos.add);
  const toggleTodo = useMutation(api.todos.toggleComplete);
  const updateTodoText = useMutation(api.todos.updateText);
  const updateDescription = useMutation(api.todos.updateDescription);
  const deleteTodo = useMutation(api.todos.remove);
  const moveToNextDay = useMutation(api.todos.moveToNextDay);
  const [newTodo, setNewTodo] = useState("");
  const [editingId, setEditingId] = useState<Id<"todos"> | null>(null);
  const [editText, setEditText] = useState("");
  const [expandedTodo, setExpandedTodo] = useState<Id<"todos"> | null>(null);
  const [showDrawing, setShowDrawing] = useState<Id<"todos"> | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    await addTodo({ text: newTodo.trim() });
    setNewTodo("");
  };

  const startEdit = (id: Id<"todos">, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const handleEdit = async (id: Id<"todos">) => {
    if (!editText.trim()) return;
    await updateTodoText({ id, text: editText.trim() });
    setEditingId(null);
    setEditText("");
  };

  const toggleExpand = (id: Id<"todos">) => {
    setExpandedTodo(expandedTodo === id ? null : id);
    setShowDrawing(null);
  };

  const toggleDrawing = (id: Id<"todos">) => {
    setShowDrawing(showDrawing === id ? null : id);
    setExpandedTodo(null);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-4 text-3xl font-bold text-center accent-text">My Tasks</h1>
        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 px-4 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newTodo.trim()}
            className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Add
          </button>
        </form>
        <ul className="space-y-4">
          {todos.map((todo) => (
            <li
              key={todo._id}
              className="overflow-hidden rounded-lg border"
            >
              <div className="flex gap-2 items-center p-3 bg-white hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo({ id: todo._id })}
                  className="w-5 h-5"
                />
                {editingId === todo._id ? (
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => handleEdit(todo._id)}
                    onKeyDown={(e) => e.key === "Enter" && handleEdit(todo._id)}
                    className="flex-1 px-2 py-1 rounded border"
                    autoFocus
                  />
                ) : (
                  <span
                    onClick={() => startEdit(todo._id, todo.text)}
                    className={`flex-1 cursor-pointer ${
                      todo.completed ? "line-through text-gray-500" : ""
                    }`}
                  >
                    {todo.text}
                  </span>
                )}
                <button
                  onClick={() => toggleExpand(todo._id)}
                  className="px-2 text-gray-500 hover:text-gray-700"
                  title="Toggle description"
                >
                  {expandedTodo === todo._id ? "▼" : "▶"}
                </button>
                <button
                  onClick={() => toggleDrawing(todo._id)}
                  className="px-2 text-gray-500 hover:text-gray-700"
                  title="Toggle drawing"
                >
                  ✏️
                </button>
                <button
                  onClick={() => moveToNextDay({ id: todo._id })}
                  className="text-gray-500 hover:text-gray-700"
                  title="Move to next day"
                >
                  →
                </button>
                <button
                  onClick={() => deleteTodo({ id: todo._id })}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
              {expandedTodo === todo._id && (
                <div className="p-4 bg-gray-50 border-t">
                  <MDXEditor
                    markdown={todo.description ?? ""}
                    onChange={(content) => {
                      updateDescription({ 
                        id: todo._id, 
                        description: content
                      });
                    }}
                    contentEditableClassName="prose prose-slate"
                    plugins={[
                      headingsPlugin(),
                      listsPlugin(),
                      quotePlugin(),
                      markdownShortcutPlugin(),
                      tablePlugin(),
                      thematicBreakPlugin(),
                      codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
                      codeMirrorPlugin({ 
                        codeBlockLanguages: { 
                          js: 'JavaScript',
                          css: 'CSS',
                          html: 'HTML',
                          python: 'Python'
                        }
                      }),
                      linkPlugin(),
                      linkDialogPlugin(),
                      frontmatterPlugin(),
                      directivesPlugin(),
                      toolbarPlugin({
                        toolbarContents: () => (
                          <>
                            <UndoRedo />
                            <Separator />
                            <BlockTypeSelect />
                            <Separator />
                            <BoldItalicUnderlineToggles />
                            <CodeToggle />
                            <Separator />
                            <ListsToggle />
                            <Separator />
                            <CreateLink />
                            <Separator />
                            <InsertTable />
                            <InsertCodeBlock />
                            <InsertThematicBreak />
                          </>
                        )
                      })
                    ]}
                  />
                </div>
              )}
              {showDrawing === todo._id && (
                <div className="border-t" style={{ height: '400px' }}>
                  <SafeTldraw>
                    <Tldraw>
                      <DrawingEditor todoId={todo._id} drawingData={todo.drawing} />
                    </Tldraw>
                  </SafeTldraw>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
