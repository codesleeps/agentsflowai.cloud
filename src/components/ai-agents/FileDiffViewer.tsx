"use client";

import { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Download,
  Eye,
  EyeOff,
  Search,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface FileDiff {
  filePath: string;
  fileName: string;
  changes: DiffChange[];
  summary: {
    added: number;
    removed: number;
    unchanged: number;
    totalLines: number;
  };
  hunks: DiffHunk[];
}

interface DiffChange {
  type: 'added' | 'removed' | 'unchanged';
  lineNumber: number;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface DiffHunk {
  header: string;
  changes: DiffChange[];
  oldStart: number;
  newStart: number;
  oldLines: number;
  newLines: number;
}

interface FileDiffViewerProps {
  diffs: FileDiff[];
  onApprove?: () => void;
  onCancel?: () => void;
  showActions?: boolean;
}

export function FileDiffViewer({
  diffs,
  onApprove,
  onCancel,
  showActions = true
}: FileDiffViewerProps) {
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [copiedContent, setCopiedContent] = useState<string | null>(null);

  const toggleFileExpansion = (fileName: string) => {
    setExpandedFiles(prev => ({
      ...prev,
      [fileName]: !prev[fileName]
    }));
  };

  const copyDiffContent = (diff: FileDiff) => {
    const content = formatDiffForCopy(diff);
    navigator.clipboard.writeText(content);
    setCopiedContent(diff.fileName);
    toast.success(`Copied diff for ${diff.fileName}`);
    setTimeout(() => setCopiedContent(null), 2000);
  };

  const downloadDiff = (diff: FileDiff) => {
    const content = formatDiffForDownload(diff);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diff.fileName}.diff`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded diff for ${diff.fileName}`);
  };

  const formatDiffForCopy = (diff: FileDiff): string => {
    let output = `File: ${diff.fileName}\n`;
    output += `Added: ${diff.summary.added} | Removed: ${diff.summary.removed} | Unchanged: ${diff.summary.unchanged}\n\n`;
    
    for (const hunk of diff.hunks) {
      output += `${hunk.header}\n`;
      for (const change of hunk.changes) {
        const prefix = change.type === 'added' ? '+' : change.type === 'removed' ? '-' : ' ';
        const lineNumber = change.newLineNumber ?? change.oldLineNumber ?? change.lineNumber;
        output += `${prefix}${lineNumber.toString().padStart(4)} ${change.content}\n`;
      }
      output += '\n';
    }
    
    return output;
  };

  const formatDiffForDownload = (diff: FileDiff): string => {
    let output = `--- a/${diff.fileName}\n`;
    output += `+++ b/${diff.fileName}\n\n`;
    
    for (const hunk of diff.hunks) {
      output += `${hunk.header}\n`;
      for (const change of hunk.changes) {
        const prefix = change.type === 'added' ? '+' : change.type === 'removed' ? '-' : ' ';
        output += `${prefix}${change.content}\n`;
      }
      output += '\n';
    }
    
    return output;
  };

  const filterChanges = (changes: DiffChange[]): DiffChange[] => {
    if (!showOnlyChanges) return changes;
    return changes.filter(change => change.type !== 'unchanged');
  };

  const searchFilteredDiffs = diffs.filter(diff => 
    diff.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    diff.changes.some(change => 
      change.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalAdded = diffs.reduce((sum, diff) => sum + diff.summary.added, 0);
  const totalRemoved = diffs.reduce((sum, diff) => sum + diff.summary.removed, 0);
  const totalUnchanged = diffs.reduce((sum, diff) => sum + diff.summary.unchanged, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Summary and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Code Changes Preview
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Review the proposed changes before approval
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  +{totalAdded}
                </Badge>
                <Badge variant="outline" className="bg-red-100 text-red-800">
                  -{totalRemoved}
                </Badge>
                <Badge variant="outline">
                  {totalUnchanged} unchanged
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOnlyChanges(!showOnlyChanges)}
                className={showOnlyChanges ? "bg-primary/10" : ""}
              >
                <Filter className="h-4 w-4 mr-2" />
                {showOnlyChanges ? 'Show All' : 'Changes Only'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Diffs */}
      <div className="space-y-4">
        {searchFilteredDiffs.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No matching changes found</p>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or filters
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          searchFilteredDiffs.map((diff) => (
            <Card key={diff.filePath}>
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleFileExpansion(diff.fileName)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedFiles[diff.fileName] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <CardTitle className="text-lg font-mono text-sm">
                      {diff.fileName}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
                        +{diff.summary.added}
                      </Badge>
                      <Badge variant="outline" className="bg-red-100 text-red-800 text-xs">
                        -{diff.summary.removed}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyDiffContent(diff);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadDiff(diff);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {expandedFiles[diff.fileName] && (
                <CardContent>
                  <Tabs defaultValue="unified">
                    <TabsList className="mb-4">
                      <TabsTrigger value="unified">Unified View</TabsTrigger>
                      <TabsTrigger value="split">Split View</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="unified">
                      <ScrollArea className="h-[400px] border rounded-lg">
                        <pre className="p-4 text-sm font-mono">
                          {diff.hunks.map((hunk, hunkIndex) => (
                            <div key={hunkIndex} className="mb-6">
                              <div className="bg-muted px-2 py-1 text-xs text-muted-foreground">
                                {hunk.header}
                              </div>
                              {filterChanges(hunk.changes).map((change, changeIndex) => (
                                <div
                                  key={changeIndex}
                                  className={`px-2 py-0.5 ${
                                    change.type === 'added' ? 'bg-green-50 text-green-800' :
                                    change.type === 'removed' ? 'bg-red-50 text-red-800' :
                                    'hover:bg-muted/50'
                                  }`}
                                >
                                  <span className="inline-block w-8 text-right text-muted-foreground text-xs mr-2">
                                    {change.newLineNumber ?? change.oldLineNumber ?? change.lineNumber}
                                  </span>
                                  <span className="select-all">
                                    {change.content || ' '}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </pre>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="split">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2 text-center">Before</h4>
                          <ScrollArea className="h-[400px] border rounded-lg">
                            <pre className="p-4 text-sm font-mono">
                              {diff.hunks.flatMap(hunk => 
                                filterChanges(hunk.changes)
                                  .filter(change => change.type !== 'added')
                                  .map((change, index) => (
                                    <div
                                      key={index}
                                      className={`px-2 py-0.5 ${
                                        change.type === 'removed' ? 'bg-red-50 text-red-800' :
                                        'hover:bg-muted/50'
                                      }`}
                                    >
                                      <span className="inline-block w-8 text-right text-muted-foreground text-xs mr-2">
                                        {change.oldLineNumber ?? change.lineNumber}
                                      </span>
                                      <span className="select-all">
                                        {change.content || ' '}
                                      </span>
                                    </div>
                                  ))
                              )}
                            </pre>
                          </ScrollArea>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2 text-center">After</h4>
                          <ScrollArea className="h-[400px] border rounded-lg">
                            <pre className="p-4 text-sm font-mono">
                              {diff.hunks.flatMap(hunk => 
                                filterChanges(hunk.changes)
                                  .filter(change => change.type !== 'removed')
                                  .map((change, index) => (
                                    <div
                                      key={index}
                                      className={`px-2 py-0.5 ${
                                        change.type === 'added' ? 'bg-green-50 text-green-800' :
                                        'hover:bg-muted/50'
                                      }`}
                                    >
                                      <span className="inline-block w-8 text-right text-muted-foreground text-xs mr-2">
                                        {change.newLineNumber ?? change.lineNumber}
                                      </span>
                                      <span className="select-all">
                                        {change.content || ' '}
                                      </span>
                                    </div>
                                  ))
                              )}
                            </pre>
                          </ScrollArea>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel Changes
            </Button>
          )}
          {onApprove && (
            <Button onClick={onApprove} className="bg-green-600 hover:bg-green-700">
              Approve Changes
            </Button>
          )}
        </div>
      )}
    </div>
  );
}