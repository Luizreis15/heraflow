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
        <Button
          size="sm"
          className="gap-1.5 rounded-lg border border-primary/45 bg-gradient-to-r from-primary to-sky-400 px-4 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-[1.02] hover:border-primary/60 hover:shadow-primary/40 active:scale-[0.98]"
        >
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
