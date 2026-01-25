"use client";

import { useState } from "react";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  ChevronRight,
  FileText,
  Code,
  Shield,
  Zap,
  Clock,
  Users,
  GitBranch
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface TechnicalPlan {
  summary: {
    title: string;
    description: string;
    complexity: 'simple' | 'medium' | 'complex';
    estimatedTotalDuration: number;
    affectedFilesCount: number;
  };
  affectedFiles: Array<{
    path: string;
    changeType: 'create' | 'modify' | 'delete';
    reason: string;
    estimatedLines?: number;
  }>;
  implementationSteps: Array<{
    id: string;
    description: string;
    toolsNeeded: any[];
    estimatedDuration: number;
    dependencies: string[];
    riskLevel: 'low' | 'medium' | 'high';
    validationCriteria: string[];
  }>;
  dependencies: {
    external: Array<{
      packageName: string;
      version: string;
      purpose: string;
      installationCommand: string;
    }>;
    internal: Array<{
      moduleName: string;
      filePath: string;
      purpose: string;
    }>;
  };
  risks: Array<{
    level: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    mitigationStrategy: string;
    impact: string;
  }>;
  acceptanceCriteria: Array<{
    id: string;
    description: string;
    testMethod: string;
    successIndicators: string[];
  }>;
  bestPractices: string[];
  agentSpecificGuidelines: string[];
}

interface PlanApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  plan: TechnicalPlan;
  taskId: string;
}

export function PlanApprovalDialog({
  isOpen,
  onClose,
  onApprove,
  plan,
  taskId
}: PlanApprovalDialogProps) {
  const [acknowledgedRisks, setAcknowledgedRisks] = useState(false);
  const [understoodImpact, setUnderstoodImpact] = useState(false);
  const [canApprove, setCanApprove] = useState(false);

  const handleAcknowledgeRisks = (checked: boolean) => {
    setAcknowledgedRisks(checked);
    updateApprovalStatus(checked, understoodImpact);
  };

  const handleUnderstandImpact = (checked: boolean) => {
    setUnderstoodImpact(checked);
    updateApprovalStatus(acknowledgedRisks, checked);
  };

  const updateApprovalStatus = (risks: boolean, impact: boolean) => {
    setCanApprove(risks && impact);
  };

  const handleApprove = () => {
    if (canApprove) {
      onApprove();
      onClose();
      toast.success("Plan approved! Execution will begin shortly.");
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'complex': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Shield className="h-6 w-6 text-blue-500" />
            Review and Approve Autonomous Plan
          </DialogTitle>
          <DialogDescription>
            Please carefully review the proposed plan before approving execution. 
            This action cannot be undone once the task begins.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
              {/* Plan Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Plan Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Task</p>
                      <p className="font-medium">{plan.summary.title}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Complexity</p>
                      <Badge className={getComplexityColor(plan.summary.complexity)}>
                        {plan.summary.complexity}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">{formatDuration(plan.summary.estimatedTotalDuration)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Files Affected</p>
                      <p className="font-medium">{plan.summary.affectedFilesCount}</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{plan.summary.description}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Implementation Steps */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Implementation Steps ({plan.implementationSteps.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {plan.implementationSteps.map((step, index) => (
                      <div key={step.id} className="p-4 border rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{step.description}</h4>
                              <Badge variant="outline" className="text-xs">
                                {step.riskLevel} risk
                              </Badge>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-2">
                              <Badge variant="secondary">⏱️ {step.estimatedDuration}min</Badge>
                              {step.toolsNeeded.map((tool, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {tool.serverName}.{tool.toolName}
                                </Badge>
                              ))}
                            </div>
                            
                            {step.dependencies.length > 0 && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <ChevronRight className="h-4 w-4" />
                                Depends on: {step.dependencies.join(', ')}
                              </div>
                            )}
                            
                            <div className="mt-2">
                              <p className="text-sm font-medium">Validation Criteria:</p>
                              <ul className="text-sm text-muted-foreground list-disc list-inside">
                                {step.validationCriteria.map((criteria, i) => (
                                  <li key={i}>{criteria}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Affected Files */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Files to be Modified ({plan.affectedFiles.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {plan.affectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          file.changeType === 'create' ? 'bg-green-100 text-green-800' :
                          file.changeType === 'modify' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {file.changeType.toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-mono text-sm">{file.path}</p>
                          <p className="text-xs text-muted-foreground">{file.reason}</p>
                        </div>
                        {file.estimatedLines && (
                          <Badge variant="outline">{file.estimatedLines} lines</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Risks and Mitigations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {plan.risks.length > 0 ? (
                    <div className="space-y-3">
                      {plan.risks.map((risk, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${getRiskColor(risk.level)}`}>
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{risk.description}</h4>
                                <Badge className={getRiskColor(risk.level)}>
                                  {risk.level.toUpperCase()} RISK
                                </Badge>
                              </div>
                              <p className="text-sm mb-2">
                                <span className="font-medium">Impact:</span> {risk.impact}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">Mitigation:</span> {risk.mitigationStrategy}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <p>No significant risks identified for this task.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Acceptance Criteria */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Acceptance Criteria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {plan.acceptanceCriteria.map((criteria) => (
                      <div key={criteria.id} className="p-3 bg-muted rounded-lg">
                        <p className="font-medium mb-1">{criteria.description}</p>
                        <p className="text-sm text-muted-foreground mb-2">
                          <span className="font-medium">Test Method:</span> {criteria.testMethod}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {criteria.successIndicators.map((indicator, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {indicator}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>

        {/* Acknowledgment and Approval */}
        <DialogFooter className="flex-col sm:flex-row gap-4 pt-4 border-t">
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="acknowledge-risks"
                checked={acknowledgedRisks}
                onCheckedChange={handleAcknowledgeRisks}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="acknowledge-risks" className="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  I acknowledge the risks and understand the potential impact of these changes
                </Label>
                <p className="text-sm text-muted-foreground">
                  I have reviewed all risks and their mitigation strategies
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="understand-impact"
                checked={understoodImpact}
                onCheckedChange={handleUnderstandImpact}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="understand-impact" className="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  I understand this will modify {plan.summary.affectedFilesCount} files in the codebase
                </Label>
                <p className="text-sm text-muted-foreground">
                  Backups will be created before any modifications are made
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={!canApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve and Execute
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}