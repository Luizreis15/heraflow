import { useNavigate } from "react-router-dom";
import { Plus, KanbanSquare, TrendingUp, FileText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

export function GlobalNewButton() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Novo
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => navigate("/tasks?new=1")}>
          <KanbanSquare className="h-4 w-4 mr-2" /> Nova tarefa
        </DropdownMenuItem>
        {hasRole(["admin", "commercial"]) && (
          <DropdownMenuItem onClick={() => navigate("/commercial?new=1")}>
            <TrendingUp className="h-4 w-4 mr-2" /> Novo lead
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate("/processes?new=1")}>
          <FileText className="h-4 w-4 mr-2" /> Novo processo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/diary?new=1")}>
          <BookOpen className="h-4 w-4 mr-2" /> Novo registro
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
